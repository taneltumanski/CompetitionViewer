using HtmlAgilityPack;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace CompetitionViewer.Services
{
    public class EDRAResultService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly EDRADragParser _dragParser;

        public EDRAResultService(EDRADragParser dragParser, IHttpClientFactory httpClientFactory)
        {
            _dragParser = dragParser;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<IEnumerable<RaceData>> GetRaceData(EventInfo eventInfo, CancellationToken token)
        {
            var client = _httpClientFactory.CreateClient();
            var result = await client.GetAsync(eventInfo.FullUri, token);

            result.EnsureSuccessStatusCode();

            var html = await result.Content.ReadAsStringAsync();

            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var table = doc.DocumentNode.Descendants("table").Single();
            var rows = table.Descendants("tr").Skip(1).ToArray();

            return rows
                .Select(x => string.Join("|", x.Descendants("td").Select(y => y.InnerText)))
                .Select(_dragParser.Parse)
                .Select(x => x.Result)
                .ToArray();
        }
    }
}
