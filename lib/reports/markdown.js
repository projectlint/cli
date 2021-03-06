const {async} = require("json2md")

const {Failure} = require('@projectlint/projectlint')

const {process} = require('./json')


const levels = ['Success', 'Warning', 'Error', 'Critical']


function convertEvaluates(value)
{
  const ast = []

  for(const [h3, project] of Object.entries(value))
  {
    if(!ast.length) ast.push({h2: 'Evaluates'})

    ast.push({h3})

    for(const [ruleName, rule] of Object.entries(project))
    {
      if(!rule) continue

      const {error, failure, level, warning} = rule
      const status = (level == null && failure instanceof Failure)
        ? 'Failure' : level2status(level)

      const badge = (level === 2 && !error && failure) ? ' [fail]' : ''

      ast.push({h4: `${status}${badge}: ${ruleName}`})

      const {message, result} = (error || failure || warning || {})

      if(result)
      {
        ast.push({ul: Array.isArray(result) ? result : [result.toString()]})
        continue
      }

      if(message) ast.push({ul: [message]})
    }
  }

  return ast
}

async function convertFixes(value)
{
  const ast = []
  const visited = []

  for(const [h3, project] of Object.entries(value))
    for(const [h4, func] of Object.entries(project))
    {
      if(!ast.length) ast.push({h2: 'Fixes'})

      if(!visited.includes(h3))
      {
        ast.push({h3})
        visited.push(h3)
      }

      const content = await func()

      ast.push({h4})

      if(content !== undefined) ast.push({code: {language: "js", content}})
    }

  return ast
}

function level2status(level = 2)
{
  return levels[level]
}


module.exports = function(stdout)
{
  let evaluates

  function write(fixes)
  {
    return async([...evaluates, ...fixes])
    .then(stdout.write.bind(stdout))
  }

  return {
    evaluates(projects, outputLevel)
    {
      return process(projects, outputLevel)
      .then(function()
      {
        evaluates = convertEvaluates(projects)
      })
    },

    fixes(projects)
    {
      return convertFixes(projects).then(write)
    }
  }
}
