// Dimensions of sunburst.
let width = document.documentElement.clientWidth
let height = document.documentElement.clientHeight - 100 // Navbars suck
let radius = Math.min(width, height) / 2;

d3.select("#explenation").style("height", height + 'px').style("width", width + 'px')

// Total size of all segments; we set this later, after loading the data.
let totalSize = 0

let vis = d3.select("#chart").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")

let partition = d3.partition()
    .size([2 * Math.PI, radius * radius])

let arc = d3.arc()
    .startAngle(function(d) { return d.x0 })
    .endAngle(function(d) { return d.x1 })
    .innerRadius(function(d) { return Math.sqrt(d.y0) })
    .outerRadius(function(d) { return Math.sqrt(d.y1) })

d3.json("steps.json").then((data) => {
  createVisualization(data)
})

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json) {

  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("svg:circle").attr("r", radius).style("opacity", 0)

  // Turn the data into a d3 hierarchy and calculate the sums.
  let root = d3.hierarchy(json).sum((d) => {
    return d.time
  }).sort((a, b) => { return b.value - a.value })

  // For efficiency, filter nodes to keep only those large enough to see.
  let nodes = partition(root).descendants().filter((d) => {
    return (d.x1 - d.x0 > 0.005) // 0.005 radians = 0.29 degrees
  })

  let path = vis.data([json]).selectAll("path")
      .data(nodes)
      .enter().append("svg:path")
      .attr("display", (d) => { return d.depth ? null : "none" })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", (d) => {
        if (d.data.complete) {
          return "#00ff00"
        } else if (typeof(d.data.complete) == 'undefined' && d.data.name != "root") {
          let progress = getCompleteness(d)
          let percent = progress[0] / (progress[0] + progress[1])
          return rgbToHex(colourGradientor(percent, [0, 255, 0], [255, 0, 0]))
        } else {
          return "#ff0000"
        }
      })
      .style("opacity", 1)
      .on("mouseover", mouseover)

  // Get total size of the tree = value of root node from partition.
  totalSize = path.datum().value
 }

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {
  // Fade all the segments.
  d3.selectAll("path").style("opacity", 0.3)

  d3.select("#name").text(d.data.name)

  let sequenceArray = d.ancestors().reverse()
  sequenceArray.shift() // remove root node from the array

  // Then highlight only those that are an ancestor of the current segment.
  vis.selectAll("path")
      .filter((node) => {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1)
}

function getCompleteness(element) {
  let children = element.children
  let progress = [0, 0]

  for (let i=0; i<children.length; i++) {
    let child = children[i]

    if (typeof(child.data) !== 'undefined') {
      child = child.data
    }

    if (typeof(child.children) !== 'undefined') {
      let temp = getCompleteness(child)
      progress[0] += temp[0]
      progress[1] += temp[1]
    } else {
      if (child.complete) {
        progress[0] += 1
      } else {
        progress[1] += 1
      }
    }
  }

  return progress
}

function colourGradientor(p, rgb_beginning, rgb_end) {
    var w = p * 2 - 1
    var w1 = (w + 1) / 2.0
    var w2 = 1 - w1

    var rgb = [parseInt(rgb_beginning[0] * w1 + rgb_end[0] * w2),
        parseInt(rgb_beginning[1] * w1 + rgb_end[1] * w2),
            parseInt(rgb_beginning[2] * w1 + rgb_end[2] * w2)]
    return rgb
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(rgb) {
    return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2])
}
