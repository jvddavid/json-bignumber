import { JSONParse, type Options, type Parse } from '@/lib/parse'
import { stringify, type Stringify } from '@/lib/stringify'
import BigNumber from 'bignumber.js'

function JSONBig(options?: Options): {
  parse: Parse
  stringify: Stringify
} {
  return {
    parse: JSONParse(options),
    stringify
  }
}
// create the default method members with no options applied for backwards compatibility
const parse: Parse = JSONParse()
JSONBig.parse = parse
JSONBig.stringify = stringify as Stringify

export { BigNumber, JSONBig, parse, stringify }
