/**
 * Created by arolave on 05/10/2016.
 */
import assign from 'lodash/assign';
import includes from 'lodash/includes';

import StellarHandler from './StellarHandler';
import StellarPubSub from './StellarPubSub';
import StellarRequest from './StellarRequest';

const requestTimeout = process.env.STELLAR_REQUEST_TIMEOUT || 30000;

function preconfigure({ defaultSourceGenerator, sourceGenerators }) {
  const _defaultSourceGenerator = defaultSourceGenerator;
  const _sourceGenerators = sourceGenerators;

  function getSourceGenerator(value) {
    return _sourceGenerators[value || process.env.STELLAR_SOURCE_GENERATOR || _defaultSourceGenerator];
  }

  const _registry = {};
  function register(source, name) {
    if (includes(_registry[source], name)) {
      throw new Error(`@Factory Unable to register multiple ${name} instances for ${source}`);
    }

    if (_registry[source]) {
      _registry[source].push(name); // eslint-disable-line better-mutation/no-mutating-methods
    } else {
      _registry[source] = [name]; // eslint-disable-line better-mutation/no-mutation
    }
  }

  return function configure({ log, transport, transportFactory, source, sourceGenerator, app = process.env.APP, ...options }) {
    const _app = app;
    const _log = log || console;
    const _transport = transport || transportFactory(assign({ log }, options));
    const _source = source || getSourceGenerator(sourceGenerator)(_log);
    const _requestTimeout = options.requestTimeout || requestTimeout;

    function stellarAppPubSub() {
      register(_source, 'stellarAppPubSub');
      return new StellarPubSub(_transport, _source, _log, _app);
    }

    function stellarNodePubSub(pubsubOptions = {}) {
      const pubsubSource = pubsubOptions.sourceOverride || _source;
      register(pubsubSource, 'stellarNodePubSub');
      return new StellarPubSub(_transport, pubsubSource, _log);
    }

    function stellarRequest(requestOptions = {}) {
      const requestSource = requestOptions.sourceOverride || _source;
      register(requestSource, 'stellarRequest');
      return new StellarRequest(_transport, requestSource, _log, _requestTimeout, stellarNodePubSub(requestOptions));
    }

    function stellarHandler() {
      register(_source, 'stellarHandler');
      return new StellarHandler(_transport, _source, _log, _app);
    }

    return {
      source: _source,
      stellarRequest,
      stellarHandler,
      stellarAppPubSub,
      stellarNodePubSub,
    };
  };
}

export default preconfigure;
