# app/services/ai/openrouter_client.rb
module AI
  class OpenrouterClient
    BASE_URL = 'https://openrouter.ai/api/v1'
    
    def initialize(api_key: nil, model: nil)
      @api_key = api_key || ENV['OPENROUTER_API_KEY']
      @model = model || ENV.fetch('LLM_MODEL', 'anthropic/claude-3.5-sonnet')
      @http_referer = ENV.fetch('FRONTEND_URL', 'http://localhost:5173')
      @app_name = 'GENTRADE Analytics'
    end

    def chat(messages:, max_tokens: 2000, temperature: 0.7)
      uri = URI("#{BASE_URL}/chat/completions")
      
      request = Net::HTTP::Post.new(uri)
      request['Authorization'] = "Bearer #{@api_key}"
      request['HTTP-Referer'] = @http_referer
      request['X-Title'] = @app_name
      request['Content-Type'] = 'application/json'
      
      request.body = {
        model: @model,
        messages: messages,
        max_tokens: max_tokens,
        temperature: temperature
      }.to_json

      response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
        http.request(request)
      end

      if response.code.to_i == 200
        parsed = JSON.parse(response.body, symbolize_names: true)
        {
          success: true,
          content: parsed.dig(:choices, 0, :message, :content),
          usage: parsed[:usage],
          model: parsed[:model]
        }
      else
        {
          success: false,
          error: "API Error: #{response.code} - #{response.body}"
        }
      end
    rescue StandardError => e
      {
        success: false,
        error: "Exception: #{e.message}"
      }
    end

    def generate_completion(prompt:, system_prompt: nil, **options)
      messages = []
      messages << { role: 'system', content: system_prompt } if system_prompt
      messages << { role: 'user', content: prompt }
      
      chat(messages: messages, **options)
    end
  end
end
