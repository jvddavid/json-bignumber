import BigNumber from 'bignumber.js'

// regexpxs extracted from
// (c) BSD-3-Clause
// https://github.com/fastify/secure-json-parse/graphs/contributors and https://github.com/hapijs/bourne/graphs/contributors

const suspectProtoRx = /(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])/
const suspectConstructorRx =
  /(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)/

/*
    json_parse.js
    2012-06-20

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    This file creates a json_parse function.
    During create you can (optionally) specify some behavioural switches

        require('json-bigint')(options)

            The optional options parameter holds switches that drive certain
            aspects of the parsing process:
            * options.strict = true will warn about duplicate-key usage in the json.
              The default (strict = false) will silently ignore those and overwrite
              values for keys that are in duplicate use.

    The resulting function follows this signature:
        json_parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = json_parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

    This is a reference implementation. You are free to copy, modify, or
    redistribute.

    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.
*/

/* members "", "\"", "\/", "\\", at, b, call, charAt, f, fromCharCode,
    hasOwnProperty, message, n, name, prototype, push, r, t, text
*/

export interface Options {
  strict?: boolean // not being strict means do not generate syntax errors for "duplicate key"
  storeAsString?: boolean // toggles whether the values should be stored as BigNumber (default) or a string
  alwaysParseAsBig?: boolean // toggles whether all numbers should be Big
  useNativeBigInt?: boolean // toggles whether to use native BigInt instead of bignumber.js
  protoAction?: 'error' | 'ignore' | 'preserve'
  constructorAction?: 'error' | 'ignore' | 'preserve'
}

export type Parse = <T = any>(source: unknown, reviver?: (this: any, key: string, value: any) => any) => T
export function JSONParse(options?: Options): Parse {
  // This is a function that can parse a JSON text, producing a JavaScript
  // data structure. It is a simple, recursive descent parser. It does not use
  // eval or regular expressions, so it can be used as a model for implementing
  // a JSON parser in other languages.

  // We are defining the function inside of another function to avoid creating
  // global variables.

  // Default options one can override by passing options to the parse()
  const _options = {
    strict: false, // not being strict means do not generate syntax errors for "duplicate key"
    storeAsString: false, // toggles whether the values should be stored as BigNumber (default) or a string
    alwaysParseAsBig: false, // toggles whether all numbers should be Big
    useNativeBigInt: false, // toggles whether to use native BigInt instead of bignumber.js
    protoAction: 'error',
    constructorAction: 'error'
  }

  // If there are options, then use them to override the default _options
  if (options !== undefined && options !== null) {
    if (options.strict === true) {
      _options.strict = true
    }
    if (options.storeAsString === true) {
      _options.storeAsString = true
    }
    _options.alwaysParseAsBig = options.alwaysParseAsBig === true ? options.alwaysParseAsBig : false
    _options.useNativeBigInt = options.useNativeBigInt === true ? options.useNativeBigInt : false

    if (typeof options.constructorAction !== 'undefined') {
      if (options.constructorAction === 'error' || options.constructorAction === 'ignore' || options.constructorAction === 'preserve') {
        _options.constructorAction = options.constructorAction
      } else {
        throw new Error(`Incorrect value for constructorAction option, must be "error", "ignore" or undefined but passed ${options.constructorAction}`)
      }
    }

    if (typeof options.protoAction !== 'undefined') {
      if (options.protoAction === 'error' || options.protoAction === 'ignore' || options.protoAction === 'preserve') {
        _options.protoAction = options.protoAction
      } else {
        throw new Error(`Incorrect value for protoAction option, must be "error", "ignore" or undefined but passed ${options.protoAction}`)
      }
    }
  }

  let at: number // The index of the current character
  let ch: string // The current character
  const escapee = {
    '"': '"',
    '\\': '\\',
    '/': '/',
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t'
  }
  let text: string
  const error = (m: string) => {
    // Call error when something is wrong.

    throw {
      name: 'SyntaxError',
      message: m,
      at,
      text
    }
  }
  const next = (c?: string) => {
    // If a c parameter is provided, verify that it matches the current character.

    if (c && c !== ch) {
      error(`Expected '${c}' instead of '${ch}'`)
    }

    // Get the next character. When there are no more characters,
    // return the empty string.

    ch = text.charAt(at)
    at += 1
    return ch
  }
  const number = () => {
    // Parse a number value.

    let number: number
    let string = ''

    if (ch === '-') {
      string = '-'
      next('-')
    }
    while (ch >= '0' && ch <= '9') {
      string += ch
      next()
    }
    if (ch === '.') {
      string += '.'
      while (next() && ch >= '0' && ch <= '9') {
        string += ch
      }
    }
    if (ch === 'e' || ch === 'E') {
      string += ch
      next()
      // @ts-ignore
      if (ch === '-' || ch === '+') {
        string += ch
        next()
      }
      while (ch >= '0' && ch <= '9') {
        string += ch
        next()
      }
    }
    number = +string
    if (Number.isFinite(number)) {
      // if (number > 9007199254740992 || number < -9007199254740992)
      // Bignumber has stricter check: everything with length > 15 digits disallowed
      if (string.length > 15) {
        return _options.storeAsString ? string : _options.useNativeBigInt ? BigInt(string) : new BigNumber(string)
      }
      return _options.alwaysParseAsBig ? (_options.useNativeBigInt ? BigInt(number) : new BigNumber(number)) : number
    }
    error('Bad number')
  }
  function string() {
    // Parse a string value.

    let hex: number
    let i: number
    let string = ''
    let uffff: number

    // When parsing for string values, we must look for " and \ characters.

    if (ch === '"') {
      let startAt = at
      while (next()) {
        if (ch === '"') {
          if (at - 1 > startAt) {
            string += text.substring(startAt, at - 1)
          }
          next()
          return string
        }
        if (ch === '\\') {
          if (at - 1 > startAt) {
            string += text.substring(startAt, at - 1)
          }
          next()
          if (ch === 'u') {
            uffff = 0
            for (i = 0; i < 4; i += 1) {
              hex = Number.parseInt(next(), 16)
              if (!Number.isFinite(hex)) {
                break
              }
              uffff = uffff * 16 + hex
            }
            string += String.fromCharCode(uffff)
          } else if (typeof escapee[ch] === 'string') {
            string += escapee[ch]
          } else {
            break
          }
          startAt = at
        }
      }
    }
    error('Bad string')
  }
  const white = () => {
    // Skip whitespace.

    while (ch && ch <= ' ') {
      next()
    }
  }
  const word = () => {
    // true, false, or null.

    switch (ch) {
      case 't': {
        next('t')
        next('r')
        next('u')
        next('e')
        return true
      }
      case 'f': {
        next('f')
        next('a')
        next('l')
        next('s')
        next('e')
        return false
      }
      case 'n': {
        next('n')
        next('u')
        next('l')
        next('l')
        return null
      }
    }
    error(`Unexpected '${ch}'`)
  }

  function value() {
    // Parse a JSON value. It could be an object, an array, a string, a number,
    // or a word.

    white()
    switch (ch) {
      case '{':
        return object()
      case '[':
        return array()
      case '"':
        return string()
      case '-':
        return number()
      default:
        return ch >= '0' && ch <= '9' ? number() : word()
    }
  }
  function array() {
    // Parse an array value.

    const array = [] as unknown[]

    if (ch === '[') {
      next('[')
      white()
      // @ts-ignore
      if (ch === ']') {
        next(']')
        return array // empty array
      }
      while (ch) {
        array.push(value())
        white()
        // @ts-ignore
        if (ch === ']') {
          next(']')
          return array
        }
        next(',')
        white()
      }
    }
    error('Bad array')
  }
  const object = (): any => {
    // Parse an object value.

    let key: string
    const object = Object.create(null)

    if (ch === '{') {
      next('{')
      white()
      // @ts-ignore
      if (ch === '}') {
        next('}')
        return object // empty object
      }
      while (ch) {
        const nKey = string()
        if (nKey === undefined) {
          error('Bad object key')
          continue
        }
        key = nKey
        white()
        next(':')
        if (_options.strict === true && Object.hasOwnProperty.call(object, key)) {
          error(`Duplicate key "${key}"`)
        }

        if (suspectProtoRx.test(key) === true) {
          if (_options.protoAction === 'error') {
            error('Object contains forbidden prototype property')
          } else if (_options.protoAction === 'ignore') {
            value()
          } else {
            object[key] = value()
          }
        } else if (suspectConstructorRx.test(key) === true) {
          if (_options.constructorAction === 'error') {
            error('Object contains forbidden constructor property')
          } else if (_options.constructorAction === 'ignore') {
            value()
          } else {
            object[key] = value()
          }
        } else {
          object[key] = value()
        }

        white()
        // @ts-ignore
        if (ch === '}') {
          next('}')
          return object
        }
        next(',')
        white()
      }
    }
    error('Bad object')
  }

  // Return the json_parse function. It will have access to all of the above
  // functions and variables.

  return <T = any>(source: unknown, reviver?: (this: any, key: string, value: any) => any): T => {
    text = `${source}`
    at = 0
    ch = ' '
    const result = value()
    white()
    if (ch) {
      error('Syntax error')
    }

    // If there is a reviver function, we recursively walk the new structure,
    // passing each name/value pair to the reviver function for possible
    // transformation, starting with a temporary root object that holds the result
    // in an empty key. If there is not a reviver function, we simply return the
    // result.

    return typeof reviver === 'function'
      ? (function walk(holder: any, key) {
          let v: any
          const value = holder[key]
          if (value && typeof value === 'object') {
            for (const k in value) {
              v = walk(value, k)
              if (v !== undefined) {
                value[k] = v
              } else {
                delete value[k]
              }
            }
          }
          return reviver.call(holder, key, value)
        })({ '': result }, '')
      : result
  }
}
