import {sourceBytes as readSource, downloadSources as download} from '../lib/download.mjs';

const acceptsUrl = url => url.protocol === 'https:' && url.hostname === 'raw.githubusercontent.com' && /^\/pagefaultgames\/pokerogue(?:-assets)?\/[a-f0-9]{40}\//.test(url.pathname);
export const sourceBytes = (entry, cache, options = {}) => readSource(entry, cache, {...options, acceptsUrl});
export const downloadSources = (lock, cache, options = {}) => download(lock, cache, {...options, acceptsUrl});
