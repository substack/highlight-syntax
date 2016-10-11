#!/usr/bin/env node
var highlight = require('../')
var concat = require('concat-stream')
var normalize = require('../normalize-lang.js')
var fs = require('fs')
var path = require('path')
var minimist = require('minimist')
var argv = minimist(process.argv.slice(2), {
  alias: { h: 'help', o: 'outfile', l: 'lang', t: 'theme' },
  default: { outfile: '-' },
  boolean: ['help']
})
if (argv.help) {
  fs.readFile(path.join(__dirname,'usage.txt'), 'utf8', function (err, src) {
    if (err) exit(err)
    else console.log(src)
  })
  return
}

var infiles = [].concat(argv.infile, argv._).filter(Boolean)
var inputs = infiles.map(function (x) {
  return x === '-' ? process.stdin : fs.createReadStream(x)
})
var langs = infiles.map(function (x) {
  var ext = normalize(path.extname(x))
  return ext === '' ? 'sh' : ext
})
if (inputs.length === 0) {
  inputs.push(process.stdin)
  langs.push(argv.lang)
}
var output = argv.outfile === '-'
  ? process.stdout
  : fs.createWriteStream(argv.outfile)

if (argv.theme) {
  var files = {}
  langs.forEach(function (lang) {
    files[path.join(__dirname,'..',lang,argv.theme+'.css')] = true
  })
  var pending = 1
  Object.keys(files).forEach(function (file) {
    pending++
    fs.readFile(file, 'utf8', function (err, src) {
      if (err) return exit(err)
      output.write('<style>\n'+src+'\n</style>\n')
      if (--pending === 0) next(0)
    })
  })
  if (--pending === 0) next(0)
} else next(0)

function next (i) {
  if (i >= inputs.length) {
    if (argv.outfile === '-') output.write('\n')
    else output.end('\n')
    return
  }
  inputs[i].pipe(concat({ encoding: 'string' }, function (src) {
    output.write('<pre class="'+langs[i]+'">'
      + highlight(langs[i],src) + '</pre>\n')
    next(i+1)
  }))
}

function exit (err) {
  console.error(err)
  process.exit(1)
}
