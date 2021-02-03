import * as d3 from 'd3'
import { legend } from '@raw-temp/rawgraphs-core'
import '../d3-styles.js'

export function render(
  svgNode,
  data,
  visualOptions,
  mapping,
  originalData,
  styles
) {
  const {
    // artboard options
    width,
    height,
    background,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    // charts options
    padding,
    binsNumber, // how many 'bins' are available
    interpolation,
    showDots,
    dotsRadius,
    //legend
    showLegend,
    legendWidth,
    // color dimension option, defined in visualOptions.js
    colorScale,
  } = visualOptions

  // Margin convention
  const margin = {
    top: marginTop,
    right: marginRight,
    bottom: marginBottom,
    left: marginLeft,
  }

  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // convert string to d3 functions
  const curveType = {
    Basis: d3.curveBasis,
    Bundle: d3.curveBundle,
    Cardinal: d3.curveCardinal,
    'Catmull–Rom': d3.curveCatmullRom,
    Linear: d3.curveLinear,
    'Monotone Y': d3.curveMonotoneY,
    Natural: d3.curveNatural,
    Step: d3.curveStep,
    'Step After': d3.curveStepAfter,
    'Step Before': d3.curveStepBefore,
  }

  // add background
  d3.select(svgNode)
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('x', 0)
    .attr('y', 0)
    .attr('fill', background)
    .attr('id', 'backgorund')

  const svg = d3
    .select(svgNode)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    .attr('id', 'viz')

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.value))
    .nice()
    .range([chartHeight, 0])

  const groupsDomain = [...new Set(data.map((d) => d.group))]

  const xScale = d3
    .scaleBand()
    .range([0, chartWidth])
    .domain(groupsDomain)
    .padding(padding / (chartWidth / groupsDomain.length)) // convert padding from pixel to percentage @TODO: not working, check

  // if series is exposed, recreate the nested structure
  const nestedData = d3.rollups(
    data,
    (v) => ({
      group: v[0].group,
      color: v[0].color,
      bins: d3.bin().domain(yScale.domain()).thresholds(binsNumber)(
        v.map((e) => e.value)
      ),
    }),
    (d) => d.group
  )

  // get the max value in the bins
  const maxValue = d3.max(
    nestedData.map((d) => d[1].bins.map((e) => e.length)).flat(1)
  )

  // compute the scale used to draw shapes
  const shapeScale = d3
    .scaleLinear()
    .range([0, xScale.bandwidth()])
    .domain([-maxValue, maxValue])

  // append scales
  svg
    .append('g')
    .attr('id', 'y axis')
    .call(d3.axisLeft(yScale))
    .append('text')
    .attr('x', 4)
    .attr('text-anchor', 'start')
    .attr('dominant-baseline', 'hanging')
    .text(mapping['value'].value)
    .styles(styles.axisLabel)

  svg
    .append('g')
    .attr('id', 'x axis')
    .attr('transform', 'translate(0,' + chartHeight + ')')
    .call(d3.axisBottom(xScale))
    .append('text')
    .attr('x', chartWidth)
    .attr('dy', -5)
    .attr('text-anchor', 'end')
    .text(mapping['group'].value)
    .styles(styles.axisLabel)

  let shapes = svg
    .append('g')
    .attr('id', 'shapes')
    .selectAll('g')
    .data(nestedData)
    .join('g')
    .attr('id', (d) => d[0])
    .attr('transform', (d) => 'translate(' + xScale(d[0]) + ' ,0)')
    .style('fill', (d) => colorScale(d[1].color))

  shapes
    .append('path')
    .datum((d) => d[1].bins) // So now we are working bin per bin
    .style('stroke', 'none')
    .attr(
      'd',
      d3
        .area()
        .x0((d) => shapeScale(-d.length))
        .x1((d) => shapeScale(d.length))
        .y((d) => yScale(d.x0))
        .curve(curveType[interpolation])
    )

  if (showDots) {
    shapes
      .selectAll('circle')
      .data((d) =>
        // merge down bins keeping x position
        d[1].bins
          .map((bin, index) =>
            bin.map((elm) => ({
              value: elm,
              index: index,
              length: bin.length,
              x0: bin.x0,
              x1: bin.x1,
            }))
          )
          .flat(1)
      )
      .join('circle')
      .attr('cy', (d) => yScale(d.value))
      .attr('cx', xScale.bandwidth() / 2)
      .attr('r', dotsRadius)
      .attr('fill', 'black')
  }

  if (showLegend) {
    // svg width is adjusted automatically because of the "container:height" annotation in legendWidth visual option

    const legendLayer = d3
      .select(svgNode)
      .append('g')
      .attr('id', 'legend')
      .attr('transform', `translate(${width},${marginTop})`)

    const chartLegend = legend().legendWidth(legendWidth)

    if (mapping.color.value) {
      chartLegend.addColor(mapping.color.value, colorScale)
    }

    legendLayer.call(chartLegend)
  }
}