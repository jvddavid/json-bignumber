import { JSONParse, type Options } from './lib/parse'
import { stringify, type Replacer } from './lib/stringify'

const parse = JSONParse()

// create the default method members with no options applied for backwards compatibility
JSONBig.parse = parse
JSONBig.stringify = stringify

export { JSONBig, parse, stringify }
export type { Options, Replacer }
export default function JSONBig(options?: Options) {
  return {
    parse: JSONParse(options),
    stringify
  }
}
