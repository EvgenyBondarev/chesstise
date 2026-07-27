using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace ChessTise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Microsoft.AspNetCore.Authorization.Authorize]
public class AiController(IConfiguration config, IHttpClientFactory httpClientFactory) : ControllerBase
{
    private async Task<string?> CallGroq(string prompt)
    {
        var apiKey = config["Groq:ApiKey"];
        if (string.IsNullOrEmpty(apiKey)) return null;

        var client = httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var body = new
        {
            model      = "llama-3.3-70b-versatile",
            messages   = new[] { new { role = "user", content = prompt } },
            max_tokens = 300,
        };

        using var resp = await client.PostAsJsonAsync("https://api.groq.com/openai/v1/chat/completions", body);
        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Groq {(int)resp.StatusCode}: {err}");
        }

        using var doc = await JsonDocument.ParseAsync(await resp.Content.ReadAsStreamAsync());
        return doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();
    }

    [HttpPost("evaluate")]
    public async Task<ActionResult<AiTextResponse>> Evaluate([FromBody] EvaluateRequest req)
    {
        var moves  = string.Join(", ", req.SuggestedMoves);
        var prompt =
            $"You are a concise chess coach. Game so far: {req.Pgn}. " +
            $"Position FEN: {req.Fen}. " +
            $"The student suggests: {moves}. " +
            $"Is this a good move? What is the key idea? Answer in exactly 2 short sentences.";

        try
        {
            var text = await CallGroq(prompt);
            if (text is null) return StatusCode(503, "AI unavailable");
            return Ok(new AiTextResponse(text.Trim()));
        }
        catch (Exception ex)
        {
            return StatusCode(503, ex.Message);
        }
    }

    [HttpPost("question")]
    public async Task<ActionResult<AiTextResponse>> Question([FromBody] QuestionRequest req)
    {
        var prompt =
            $"You are a chess coach. Game so far: {req.Pgn}. " +
            $"Position FEN: {req.Fen}. " +
            $"The student asks: {req.Question}. " +
            $"Answer concisely in 2-3 sentences.";

        try
        {
            var text = await CallGroq(prompt);
            if (text is null) return StatusCode(503, "AI unavailable");
            return Ok(new AiTextResponse(text.Trim()));
        }
        catch (Exception ex)
        {
            return StatusCode(503, ex.Message);
        }
    }

    [HttpPost("intro")]
    public async Task<ActionResult<AiTextResponse>> Intro([FromBody] IntroRequest req)
    {
        var context = req.Year.HasValue ? $"{req.Year}" : "";
        if (!string.IsNullOrEmpty(req.Event)) context += string.IsNullOrEmpty(context) ? req.Event : $", {req.Event}";
        var prompt =
            $"You are a concise chess commentator. Introduce the game between {req.White} and {req.Black}" +
            (string.IsNullOrEmpty(context) ? "" : $" ({context})") +
            ". Who are these players and what style of play should we expect? Answer in exactly 2 short sentences.";

        try
        {
            var text = await CallGroq(prompt);
            if (text is null) return StatusCode(503, "AI unavailable");
            return Ok(new AiTextResponse(text.Trim()));
        }
        catch (Exception ex)
        {
            return StatusCode(503, ex.Message);
        }
    }

    [HttpPost("explain")]
    public async Task<ActionResult<AiTextResponse>> Explain([FromBody] ExplainRequest req)
    {
        var prompt =
            $"You are a concise chess coach. Game so far: {req.Pgn}. " +
            $"Position FEN: {req.Fen}. " +
            $"The move played was {req.Move}. " +
            $"Explain the strategic or tactical reason in exactly 2 short sentences.";

        try
        {
            var text = await CallGroq(prompt);
            if (text is null) return StatusCode(503, "AI unavailable");
            return Ok(new AiTextResponse(text.Trim()));
        }
        catch (Exception ex)
        {
            return StatusCode(503, ex.Message);
        }
    }
}

public record QuestionRequest(string Fen, string Pgn, string Question);
public record IntroRequest(string White, string Black, int? Year, string? Event);
public record EvaluateRequest(string Fen, string Pgn, string[] SuggestedMoves);
public record ExplainRequest(string Fen, string Pgn, string Move);
public record AiTextResponse(string Text);
