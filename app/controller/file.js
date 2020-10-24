/* eslint-disable no-unused-vars */
'use strict';

const Controller = require('egg').Controller;

const fs = require('fs');
const path = require('path');


class FileController extends Controller {
  // 上传
  async upload() {
    const { ctx, app, service } = this;
    const currentUser = ctx.authUser;
    console.log(ctx.request.files);

    if (!ctx.request.files) {
      return ctx.apiFail('请先选择上传文件');
    }

    ctx.validate({
      file_id: {
        required: true,
        type: 'int',
        defValue: 0,
        desc: '目录id',
      },
    });

    const file_id = ctx.query.file_id;
    console.log(file_id + '<<<<<<<<<<');
    // 目录id是否存在
    if (file_id > 0) {
      // 目录是否存在
      await service.file.isDirExist(file_id);
    }
    // 取得上传的文件
    const file = ctx.request.files[0];


    // 根据file_id一直向上找到顶层目录
    const prefixPath = await service.file.seachDir(file_id);
    console.log(prefixPath);
    // 拼接出最终文件上传目录
    const name = prefixPath + ctx.genID(10) + path.extname(file.filename);


    // 判断用户网盘内存是否不足
    const s = await new Promise((resolve, reject) => {
      fs.stat(file.filepath, (err, stats) => {
        resolve((stats.size / 1024).toFixed(1));
      });
    });

    if (currentUser.total_size - currentUser.used_size < s) {
      return ctx.apiFail('你的可用内存不足');
    }

    // 上传到oss
    let result;
    try {
      result = await ctx.oss.put(name, file.filepath);
    } catch (err) {
      console.log(err);
    }

    console.log(result.url);

    // 写入到数据表
    if (result) {
      const addData = {
        name: file.filename,
        ext: file.mimeType,
        md: result.name,
        file_id,
        user_id: currentUser.id,
        size: parseInt(s),
        isdir: 0,
        url: result.url,
      };
      const res = await app.model.File.create(addData);

      // 更新用户的网盘内存使用情况
      currentUser.used_size = currentUser.used_size + parseInt(s);
      currentUser.save();

      return ctx.apiSuccess(res);
    }

    ctx.apiFail('上传失败');
  }
}

module.exports = FileController;
