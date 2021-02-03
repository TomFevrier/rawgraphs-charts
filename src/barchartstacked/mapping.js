import * as d3 from 'd3'
import { getDimensionAggregator } from '@raw-temp/rawgraphs-core'

export const mapData = function (data, mapping, dataTypes, dimensions) {
  console.log('- mapping')

  // as we are working on a multiple dimension (bars), `getDimensionAggregator` will return an array of aggregator functions
  // the order of aggregators is the same as the value of the mapping
  const barsAggregators = getDimensionAggregator(
    'bars',
    mapping,
    dataTypes,
    dimensions
  )

  // add the non-compulsory dimensions.
  'series' in mapping ? null : (mapping.series = { value: undefined })

  let results = []
  const result = d3.rollups(
    data,
    (v) => {
      
      // for every dimension in the bars field, create an item
      mapping.bars.value.forEach((barName, i) => {
        
        //getting values for aggregation
        const valuesForSize = v.map(x => x[barName])
        //getting i-th aggregator
        const aggregator = barsAggregators[i]

        // create the item
        const item = {
          series: v[0][mapping.series.value], // get the first one since it's grouped
          stacks: v[0][mapping.stacks.value], // get the first one since it's grouped
          bars: barName,
          // #TODO: remove me if dynamic aggregation works
          // size: v.reduce((result, elm) => result + elm[barName], 0),
          size: aggregator(valuesForSize),
          color: barName,
        }
        results.push(item)
      })
    },
    (d) => d[mapping.series.value], // series grouping
    (d) => d[mapping.stacks.value].toString() // stacks grouping. toString() to enable grouping on dates
  )
  return results
}