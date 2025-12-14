// lib/ai/tools/transformer.js
/**
 * MCP Tool Format Transformer
 * 
 * Transforms tool definitions and results between different formats:
 * - Anthropic format: Native Claude tool format
 * - OpenAI format: Used by DeepSeek, OpenAI, and many other providers
 * 
 * @see docs/MULTI_MODEL_ARCHITECTURE.md
 */

import { TOOL_FORMATS, getToolFormat, getProvider, PROVIDERS } from '../models/registry.js'

/**
 * Transform tool definitions for a specific model
 * 
 * @param {Array} tools - Array of tool definitions in Anthropic format
 * @param {string} modelId - Target model identifier
 * @returns {Array} Transformed tool definitions
 */
export function transformToolsForModel(tools, modelId) {
  if (!tools || !Array.isArray(tools) || tools.length === 0) {
    return null
  }
  
  const targetFormat = getToolFormat(modelId)
  
  if (!targetFormat) {
    // Model doesn't support tools
    return null
  }
  
  // Detect source format from first tool
  const sourceFormat = detectToolFormat(tools[0])
  
  if (sourceFormat === targetFormat) {
    // No transformation needed
    return tools
  }
  
  // Transform to target format
  if (sourceFormat === TOOL_FORMATS.ANTHROPIC && targetFormat === TOOL_FORMATS.OPENAI) {
    return tools.map(anthropicToOpenAI)
  }
  
  if (sourceFormat === TOOL_FORMATS.OPENAI && targetFormat === TOOL_FORMATS.ANTHROPIC) {
    return tools.map(openAIToAnthropic)
  }
  
  // Unknown transformation - return as-is with warning
  console.warn(`[ToolTransformer] Unknown transformation: ${sourceFormat} -> ${targetFormat}`)
  return tools
}

/**
 * Detect the format of a tool definition
 * 
 * @param {Object} tool - Tool definition
 * @returns {string} Format identifier (TOOL_FORMATS.ANTHROPIC or TOOL_FORMATS.OPENAI)
 */
function detectToolFormat(tool) {
  // Anthropic format has 'input_schema' at root level
  if (tool.input_schema) {
    return TOOL_FORMATS.ANTHROPIC
  }
  
  // OpenAI format has 'function' wrapper with 'parameters'
  if (tool.function || tool.type === 'function') {
    return TOOL_FORMATS.OPENAI
  }
  
  // OpenAI format may also have 'parameters' directly (simplified)
  if (tool.parameters) {
    return TOOL_FORMATS.OPENAI
  }
  
  // Default to Anthropic
  return TOOL_FORMATS.ANTHROPIC
}

/**
 * Convert Anthropic tool definition to OpenAI format
 * 
 * Anthropic format:
 * {
 *   name: "tool_name",
 *   description: "...",
 *   input_schema: { type: "object", properties: {...}, required: [...] }
 * }
 * 
 * OpenAI format:
 * {
 *   type: "function",
 *   function: {
 *     name: "tool_name",
 *     description: "...",
 *     parameters: { type: "object", properties: {...}, required: [...] }
 *   }
 * }
 * 
 * @param {Object} tool - Anthropic tool definition
 * @returns {Object} OpenAI tool definition
 */
function anthropicToOpenAI(tool) {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.input_schema || {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
}

/**
 * Convert OpenAI tool definition to Anthropic format
 * 
 * @param {Object} tool - OpenAI tool definition
 * @returns {Object} Anthropic tool definition
 */
function openAIToAnthropic(tool) {
  // Handle both wrapped and unwrapped formats
  const func = tool.function || tool
  
  return {
    name: func.name,
    description: func.description || '',
    input_schema: func.parameters || {
      type: 'object',
      properties: {},
      required: []
    }
  }
}

/**
 * Transform a tool call result for a specific provider
 * 
 * @param {Object} toolResult - Tool result object
 * @param {string} modelId - Target model identifier
 * @returns {Object} Transformed tool result for message array
 */
export function transformToolResultForModel(toolResult, modelId) {
  const provider = getProvider(modelId)
  
  if (provider === PROVIDERS.ANTHROPIC) {
    return transformToolResultForAnthropic(toolResult)
  }
  
  if (provider === PROVIDERS.DEEPSEEK) {
    return transformToolResultForOpenAI(toolResult)
  }
  
  // Default to OpenAI format
  return transformToolResultForOpenAI(toolResult)
}

/**
 * Transform tool result for Anthropic message format
 * 
 * @param {Object} toolResult - Tool result object
 * @returns {Object} Anthropic-formatted message
 */
function transformToolResultForAnthropic(toolResult) {
  return {
    role: 'user',
    content: [{
      type: 'tool_result',
      tool_use_id: toolResult.id,
      content: typeof toolResult.result === 'string' 
        ? toolResult.result 
        : JSON.stringify(toolResult.result),
      is_error: toolResult.isError || false
    }]
  }
}

/**
 * Transform tool result for OpenAI message format
 * 
 * @param {Object} toolResult - Tool result object
 * @returns {Object} OpenAI-formatted message
 */
function transformToolResultForOpenAI(toolResult) {
  return {
    role: 'tool',
    tool_call_id: toolResult.id,
    content: typeof toolResult.result === 'string' 
      ? toolResult.result 
      : JSON.stringify(toolResult.result)
  }
}

/**
 * Transform a tool use request for a specific provider
 * 
 * @param {Object} toolUse - Tool use request from AI
 * @param {string} modelId - Model that made the request
 * @returns {Object} Normalized tool use object
 */
export function normalizeToolUse(toolUse, modelId) {
  const provider = getProvider(modelId)
  
  if (provider === PROVIDERS.ANTHROPIC) {
    // Anthropic format
    return {
      id: toolUse.id,
      name: toolUse.name,
      input: toolUse.input || {}
    }
  }
  
  if (provider === PROVIDERS.DEEPSEEK || provider === PROVIDERS.OPENAI) {
    // OpenAI format - tool call is nested in 'function'
    const func = toolUse.function || toolUse
    return {
      id: toolUse.id,
      name: func.name,
      input: typeof func.arguments === 'string' 
        ? JSON.parse(func.arguments) 
        : func.arguments || {}
    }
  }
  
  // Default - assume Anthropic format
  return {
    id: toolUse.id,
    name: toolUse.name,
    input: toolUse.input || {}
  }
}

/**
 * Build assistant message with tool use for a specific provider
 * 
 * @param {Object} toolUse - Normalized tool use object
 * @param {string} modelId - Target model identifier
 * @returns {Object} Provider-formatted assistant message
 */
export function buildToolUseMessage(toolUse, modelId) {
  const provider = getProvider(modelId)
  
  if (provider === PROVIDERS.ANTHROPIC) {
    return {
      role: 'assistant',
      content: [{
        type: 'tool_use',
        id: toolUse.id,
        name: toolUse.name,
        input: toolUse.input
      }]
    }
  }
  
  if (provider === PROVIDERS.DEEPSEEK || provider === PROVIDERS.OPENAI) {
    return {
      role: 'assistant',
      content: null, // OpenAI format has null content when tool_calls present
      tool_calls: [{
        id: toolUse.id,
        type: 'function',
        function: {
          name: toolUse.name,
          arguments: JSON.stringify(toolUse.input)
        }
      }]
    }
  }
  
  // Default to Anthropic format
  return {
    role: 'assistant',
    content: [{
      type: 'tool_use',
      id: toolUse.id,
      name: toolUse.name,
      input: toolUse.input
    }]
  }
}

/**
 * Check if a message contains tool calls
 * 
 * @param {Object} message - Message object
 * @returns {boolean}
 */
export function hasToolCalls(message) {
  // Anthropic format
  if (Array.isArray(message.content)) {
    return message.content.some(c => c.type === 'tool_use')
  }
  
  // OpenAI format
  if (message.tool_calls && message.tool_calls.length > 0) {
    return true
  }
  
  return false
}

/**
 * Extract tool calls from a message
 * 
 * @param {Object} message - Message object
 * @returns {Array} Array of normalized tool use objects
 */
export function extractToolCalls(message) {
  const calls = []
  
  // Anthropic format
  if (Array.isArray(message.content)) {
    for (const block of message.content) {
      if (block.type === 'tool_use') {
        calls.push({
          id: block.id,
          name: block.name,
          input: block.input || {}
        })
      }
    }
  }
  
  // OpenAI format
  if (message.tool_calls && Array.isArray(message.tool_calls)) {
    for (const call of message.tool_calls) {
      calls.push({
        id: call.id,
        name: call.function?.name || call.name,
        input: typeof call.function?.arguments === 'string'
          ? JSON.parse(call.function.arguments)
          : call.function?.arguments || {}
      })
    }
  }
  
  return calls
}
