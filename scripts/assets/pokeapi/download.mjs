import {sourceBytes as readSource, downloadSources as download} from '../lib/download.mjs';
import {acceptsUrl} from './common.mjs';

export const sourceBytes = (entry, cache, options = {}) => readSource(entry, cache, {...options, acceptsUrl});
export const downloadSources = (lock, cache, options = {}) => download(lock, cache, {...options, acceptsUrl});
