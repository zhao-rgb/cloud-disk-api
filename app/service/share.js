'use strict';

const Service = require('egg').Service;

class ShareService extends Service {

  // 分享是否存在
  async isExist(sharedurl, options = {}) {
    const s = await this.app.model.Share.findOne({
      where: {
        sharedurl,
        iscancel: 0,
      },
      ...options,
    });

    if (!s) {
      return this.ctx.throw(404, '该分享已失效');
    }

    return s;
  }
}

module.exports = ShareService;
