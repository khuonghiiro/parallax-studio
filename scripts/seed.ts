import {writeFileSync} from 'node:fs';
import {createDemo} from '../shared/demo';
writeFileSync(new URL('../engine/seed.json',import.meta.url),JSON.stringify(createDemo(),null,2));
