// server/api/chat/clm-sse-server-test.ts
import OpenAI from 'openai';
import { ContextTracker } from './hume-context-tracker';
import { toolRegistry } from '../../tools/tool-registry';
import type { ToolCall, ToolCallResult } from '../../tools/base/BaseTool';
import { config, getBaseUrl, getApiKey, getModelName } from './llm-model-choice-helper';
import { analyzeEmotions } from './emotions/hume-text-client';

const openai = new OpenAI({
  apiKey: getApiKey(config.USE_PLATFORM),
  baseURL: getBaseUrl(config.USE_PLATFORM)
});

// Use the helper function instead
const validatedModel = getModelName(config.USE_PLATFORM);

// Helper function to setup SSE response headers
function setupSSEResponse(stream: TransformStream) {
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// Process tool calls using the registry
async function handleToolCalls(toolCalls: ToolCall[]): Promise<ToolCallResult[]> {
  const results: ToolCallResult[] = [];
  for (const toolCall of toolCalls) {
    try {
      const result = await toolRegistry.executeTool(toolCall);
      console.log(`Successfully processed ${toolCall.function.name} request`);
      results.push(result);
    } catch (error) {
      console.error(`❌ Error processing tool call ${toolCall.function.name}:`, {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        toolCall: {
          name: toolCall.function.name,
          args: toolCall.function.arguments?.substring(0, 100) + '...'
        }
      });
    }
  }
  return results;
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      
      if (!authHeader.startsWith('Bearer ') || !token) {
        console.error('❌ Authentication failed:', {
          hasBearer: authHeader.startsWith('Bearer '),
          hasToken: !!token,
          authHeader: authHeader.substring(0, 20) + '...' // Log first 20 chars for debugging
        });
        return new Response(
          JSON.stringify({ error: 'Invalid authorization format' }), 
          { 
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }
    }

    const body = await req.json();

    // Get custom session ID if provided
    const customSessionId = new URL(req.url).searchParams.get('custom_session_id');

    // Store prosody data to use in responses
    const prosodyData: { [key: string]: any } = {};
    
    // Analyze emotions for the latest message
    const latestMessage = body.messages[body.messages.length - 1];
    if (latestMessage?.message?.content) {
      const emotions = await analyzeEmotions(latestMessage.message.content);
      prosodyData[latestMessage.message.content] = emotions;
    }

    // Initialize context tracker with the specified model
    const contextTracker = new ContextTracker(validatedModel);

    // Mental health focused system prompt
    const systemPrompt = `You are Meld, an empathetic and insightful AI companion focused on emotional wellbeing and personal growth. Your approach combines:

1. Emotional Intelligence
- Deep understanding of human emotions and their nuances
- Ability to recognize emotional patterns and provide gentle insights
- Use of emotion-aware language that validates feelings while encouraging growth

2. Therapeutic Techniques
- Active listening and reflection
- Cognitive reframing when appropriate
- Mindfulness and grounding techniques
- Solution-focused brief therapy approaches

3. Communication Style
- Warm, authentic, and conversational
- Natural language with appropriate emotional expressions
- Balance of support and gentle challenging when needed
- Use of thoughtful questions to deepen understanding

4. Growth Focus
- Emphasis on personal development and emotional resilience
- Recognition of progress and small wins
- Gentle guidance toward helpful perspectives and coping strategies

Remember previous conversations and build on shared context. Maintain appropriate boundaries while being genuinely supportive. Your goal is to help users develop emotional awareness and resilience while feeling truly heard and understood.`;

    // Combine system prompt with conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...body.messages.map((msg: any) => {
        // Map message roles correctly
        const role = msg.type === 'user_message' ? 'user' : 
                    msg.type === 'assistant_message' ? 'assistant' : 
                    msg.role;

        // Store prosody data for this message if available
        if (msg.models?.prosody?.scores) {
          prosodyData[msg.content] = msg.models.prosody.scores;
        }

        // Return properly formatted message
        return {
          role,
          content: msg.message?.content || msg.content
        };
      })];
    
    console.log('🤖 Starting chat completion with model:', getModelName(config.USE_PLATFORM));
    
    // Start OpenAI stream with configured model
    const stream2 = await openai.chat.completions.create({
      model: getModelName(config.USE_PLATFORM),
      messages: contextTracker.shouldTruncate(messages) ? 
        contextTracker.truncateMessages(messages) : 
        messages,
      tools: toolRegistry.getTools(),
      tool_choice: 'auto',
      stream: true,
      ...(config.USE_PLATFORM === 'OPEN_ROUTER' && {
        headers: {
          'HTTP-Referer': 'https://github.com/mindpattern',
          'X-Title': 'MindPattern'
        }
      })
    });

    // Process the stream
    (async () => {
      try {
        let fullResponse = '';
        let startTime = Date.now();
        
        let finalToolCalls: Record<number, ToolCall> = {};
        let toolCallsProcessed = false;  // Add flag to track if we've processed tools
        
        for await (const chunk of stream2) {
          if (chunk.choices[0]?.delta?.tool_calls && !toolCallsProcessed) {
            const toolCalls = chunk.choices[0].delta.tool_calls;
       
            for (const toolCall of toolCalls) {
              if (!toolCall.function) continue;
              
              const index = toolCall.index || 0;
              if (!finalToolCalls[index]) {
                finalToolCalls[index] = {
                  id: toolCall.id || '',
                  index,
                  function: {
                    name: toolCall.function.name || '',
                    arguments: ''
                  }
                };
              }
              
              if (toolCall.function.arguments) {
                finalToolCalls[index].function.arguments += toolCall.function.arguments;
              }

              // Move isComplete check inside the loop where we have access to toolCall
              const currentToolCall = finalToolCalls[index];
              const isComplete = currentToolCall.function.arguments?.endsWith('}') || 
                                chunk.choices[0]?.finish_reason === 'tool_calls' || 
                                chunk.choices[0]?.delta?.content;
                                
              if (isComplete) {
                const completedCalls = Object.values(finalToolCalls);
                if (completedCalls.length > 0) {
                  console.log('Processing completed tool calls:', completedCalls);
                  const results = await handleToolCalls(completedCalls);
                  
                  if (results.length > 0) {
                    console.log('Tool call results:', results);
                    
                    const toolMessage = {
                      role: "assistant",
                      tool_calls: completedCalls.map(call => ({
                        id: call.id,
                        type: "function",
                        function: {
                          name: call.function.name,
                          arguments: call.function.arguments
                        }
                      }))
                    };
                    
                    const toolResults = results.map((result: ToolCallResult) => {
                      // Parse the JSON output to make it more readable for the LLM
                      const parsedOutput = JSON.parse(result.output);
                      const formattedOutput = Object.entries(parsedOutput)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('\n');

                      return {
                        role: "tool",
                        tool_call_id: result.tool_call_id,
                        content: formattedOutput
                      };
                    });
                    
                    messages.push(toolMessage, ...toolResults);
                    
                    // Make one final call after tool processing
                    const finalResponse = await openai.chat.completions.create({
                      model: validatedModel,
                      messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages
                      ],
                      stream: true
                    });
                    
                    // Process the final response
                    for await (const finalChunk of finalResponse) {
                      if (finalChunk.choices[0]?.delta?.content) {
                        const content = finalChunk.choices[0].delta.content;
                        fullResponse += content;
                        
                        const data = {
                          id: finalChunk.id,
                          object: 'chat.stream.chunk',
                          created: finalChunk.created,
                          model: validatedModel,
                          choices: [{
                            index: 0,
                            delta: {
                              role: 'assistant',
                              content: content
                            },
                            finish_reason: null,
                            logprobs: null,
                            models: {
                              prosody: {
                                scores: analyzeEmotions(fullResponse)
                              }
                            },
                            time: {
                              begin: startTime,
                              end: Date.now()
                            }
                          }],
                          type: 'assistant_input',
                          system_fingerprint: customSessionId
                        };
                        
                        await writer.write(
                          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                        );
                      }
                    }
                    
                    toolCallsProcessed = true;  // Mark tools as processed
                    break;  // Exit the main stream loop
                  }
                }
              }
            }
          }

          // Handle regular content if no tool calls
          if (chunk.choices[0]?.delta?.content && !toolCallsProcessed) {
            const content = chunk.choices[0].delta.content;
            fullResponse += content;
            
            // Format response to match Hume's expectations
            const data = {
              id: chunk.id,
              object: 'chat.stream.chunk',
              created: chunk.created,
              model: validatedModel,
              choices: [{
                index: 0,
                delta: {
                  role: 'assistant',
                  content: content
                },
                finish_reason: null,
                logprobs: null,
                // Add Hume-specific fields with last known prosody scores
                models: {
                  prosody: {
                    scores: analyzeEmotions(fullResponse)
                  }
                },
                time: {
                  begin: startTime,
                  end: Date.now()
                }
              }],
              type: 'assistant_input',  // Required by Hume
              system_fingerprint: customSessionId // Include session ID if provided
            };
            
            await writer.write(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }
        }
        
        // Send final message
        const endMessage = {
          type: 'assistant_end',
          time: {
            begin: startTime,
            end: Date.now()
          },
          models: {
            prosody: {
              scores: analyzeEmotions(fullResponse)
            }
          }
        };
        await writer.write(encoder.encode(`data: ${JSON.stringify(endMessage)}\n\n`));
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        console.error('Streaming error:', error);
        const errorData = {
          type: 'error',
          error: error instanceof Error ? error.message : 'An error occurred while streaming'
        };
        await writer.write(
          encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
        );
      } finally {
        await writer.close();
      }
    })();

    return setupSSEResponse(stream);
  } catch (error) {
    console.error('POST Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process request' }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true'
        }
      }
    );
  }
}