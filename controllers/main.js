/**
 * controllers/main
 *
 */

const lodash = require('lodash');
const send = require('koa-send');

const actions = require('../actions/index');
const pathToUrl = require('../services/path-to-url');
const parseConfig = require('../services/parse-config');
const renderReadme = require('../services/render-readme');

module.exports = function(router) {
    const shotMW = function *() {
        const timestamp = Date.now();
        const body = this.request.body;
        const query = this.query;

        // Guide
        if(this.method === 'GET' && lodash.isEmpty(query)) {
            this.body = yield renderReadme();

            return;
        }

        // parse config
        const cfg = yield parseConfig(lodash.merge({}, query, body));

        let ret = null;
        if(actions[cfg.action]) {
            ret = yield actions[cfg.action](cfg);
        }
        else {
            this.throw(400, 'No action defined: ' + cfg.action);
        }

        // check result
        if(!ret) {
            this.throw(500, 'Unknow error');
        }

        // respone image
        if(cfg.dataType === 'image') {
            return yield send(this, ret.image);
        }

        // covert result (local path -> url)
        const result = {
            id: cfg.id,
            image: pathToUrl(ret.image),
            images: lodash.map(ret.images, pathToUrl),
            metadata: ret.metadata || null,
            // elapsed
            elapsed: Date.now() - timestamp
        };

        if(ret.images) {
            result.images = ret.images.map(pathToUrl);
        }

        this.body = result;
    };

    router.post('/', shotMW);
    router.get('/', shotMW);
};