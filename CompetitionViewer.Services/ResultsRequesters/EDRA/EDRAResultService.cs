using Functional;
using HtmlAgilityPack;
using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace CompetitionViewer.Services.ResultsRequesters.EDRA
{
    public class EDRAResultService
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public EDRAResultService(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public async Task<string> GetRaceHtml(EDRAEventInfo eventInfo, CancellationToken token)
        {
            using var client = _httpClientFactory.CreateClient("EDRAClient");
            using var result = await client.GetAsync(eventInfo.FullUri, token);

            result.EnsureSuccessStatusCode();

            return await result.Content.ReadAsStringAsync();
        }

        public async Task<ImmutableArray<EDRADragParser.ParseResult>> GetRaceData(EDRAEventInfo eventInfo, CancellationToken token)
        {
            var html = await GetRaceHtml(eventInfo, token);

            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var table = doc.DocumentNode.Descendants("table").SingleOrDefault();
            var rows = table?.Descendants("tr").Skip(1).ToArray() ?? Array.Empty<HtmlNode>();
            var parser = new EDRADragParser();

            if (!rows.Any())
            {
                return ImmutableArray<EDRADragParser.ParseResult>.Empty;
            }

            return rows
                .Select(x => string.Join("|", x.Descendants("td").Select(y => y.InnerText)))
                .Select(x => parser.Parse(x))
                .ToImmutableArray();
        }
    }
}
