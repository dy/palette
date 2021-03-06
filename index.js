/*!
 * @module image-palette
 */
 'use strict'

var cid = require('color-id')
var pxls = require('pxls')
var quantize = require('quantize')

module.exports = palette
module.exports.quantized = quantized
module.exports.average = quantized

// return directly counted colors, if src contains less than maxCount of them
function palette(src, maxCount) {
  if (maxCount == null || typeof maxCount !== 'number') maxCount = 5

  if (!maxCount) return {colors: [], ids: [], amount: []}
  if (maxCount === 1) return average(src)

  var pixels = pxls(src)
  var total = pixels.length >> 2

  var colorIds = {}
  var colors = []
  var count = []
  var ids = Array(total)

  for (var i = 0; i < pixels.length; i += 4) {
    var rgb = pixels.subarray(i, i + 3)
    var irgb = cid(rgb, false)

    // register new color
    if (colorIds[irgb] == null) {
      // if palette goes over the indicated maxColors, use quantization
      if (colors.length >= maxCount) {
        return quantized(src, maxCount)
      }

      colorIds[irgb] = colors.length
      colors.push(pixels.subarray(i, i + 4))
    }

    count[colorIds[irgb]] = (count[colorIds[irgb]] || 0) + 1

    ids[i >> 2] = colorIds[irgb]
  }

  return {
    colors: colors,
    ids: ids,
    amount: count.map(function (v) { return v / total })
  }
}


// return quantized palette colors
function quantized (src, count) {
  if (count == null || typeof count !== 'number') count = 5

  if (!count) return {colors: [], ids: [], amount: []}
  if (count === 1) return average(src)

  var pixels = pxls(src)
  var total = pixels.length >> 2

  var pixelArray = []
  for (var i=0, len=pixels.length; i<len; i+=4) {
    var r = pixels[i + 0],
        g = pixels[i + 1],
        b = pixels[i + 2],
        a = pixels[i + 3]

    pixelArray.push([ r, g, b ])
  }

  // fix because quantize breaks on < 2
  var cluster = quantize(pixelArray, count)
  var vboxes = cluster.vboxes.map(function (vb) {
    vb.size = vb.vbox.count() * vb.vbox.volume()
    return vb
  }).slice(0, count)

  var colorIds = {}
  var colors = []
  var ids = Array(total)
  var sum = 0

  for (var i = 0; i < vboxes.length; i++) {
    var vbox = vboxes[i]
    var color = vbox.color
    color.push(255)
    var colorId = cid(color, false)
    colorIds[colorId] = colors.length
    colors.push(color)
    sum += vbox.size
  }

  // generate ids
  for (var i = 0; i < total; i++) {
    var color = cluster.map(pixelArray[i])
    var colorId = cid(color, false)
    ids[i] = colorIds[colorId]
  }

  return {
    colors: colors,
    ids: ids,
    amount: vboxes.map(function (vb) {
      return vb.size / sum
    })
  }
}

// single-color calc
function average (src) {
  var pixels = pxls(src)
  var total = pixels.length >> 2

  var sum = [0,0,0,0]

  for (let i = 0; i < src.length; i+=4) {
    sum[0] += src[i]
    sum[1] += src[i + 1]
    sum[2] += src[i + 2]
    sum[3] += src[i + 3]
  }
  var avg = new Uint8Array([sum[0] / total, sum[1] / total, sum[2] / total, sum[3] / total])
  var ids = new Uint8Array(total)

  return {
    colors: [avg],
    amount: [1],
    ids: ids
  }
}
