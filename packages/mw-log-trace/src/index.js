import toUpper from 'lodash/toUpper';

function buildPrefix(obj, start, err) {
  const str = `stellar ${err ? 'ERROR' : toUpper(obj.headers.type)}`;

  if (start) {
    return `${str} ${Date.now() - start}ms`;
  }
  return str;
}

function doLogFactory(logTraceDetail) {
  return function doLog(logger, prefix, metadata) {
    switch (logTraceDetail) {
      case 'FULL':
        logger(prefix, metadata);
        break;
      case 'HEADERS':
        logger(prefix, metadata.headers);
        break;
      default:
        break;
    }
  };
}

export function mwLogTraceFactory({ logTraceDetail = process.env.STLR_LOG_TRACE_DETAIL || 'FULL' } = {}) {
  const doLog = doLogFactory(logTraceDetail);

  return function mwLogTrace(req, next, options, log) {
    doLog(log.info, buildPrefix(req), req);
    const start = Date.now();
    return next()
        .then((res) => {
          doLog(log.info, buildPrefix(res, start), res);
          return res;
        })
        .catch((err) => {
          const res = err.__stellarResponse;
          doLog(log.error, buildPrefix(res, start, err), res);
          throw err;
        });
  };
}

const defaultMwLogTrace = mwLogTraceFactory();
export default defaultMwLogTrace;
