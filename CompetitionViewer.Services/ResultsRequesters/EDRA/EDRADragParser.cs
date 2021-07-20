using HtmlAgilityPack;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Globalization;
using System.Linq;
using System.Text;
using Functional;
using System.Security.Cryptography;

namespace CompetitionViewer.Services.ResultsRequesters.EDRA
{
    public class EDRADragParser
    {
        private readonly ImmutableDictionary<int, Action<RaceDataParseModel, string>> _parsers = new Dictionary<int, Action<RaceDataParseModel, string>>()
        {
            [0] = new Action<RaceDataParseModel, string>((d, v) => d.Timestamp = DateTimeOffset.ParseExact(v, "dd.MM.yyyy", CultureInfo.InvariantCulture)),
            [1] = new Action<RaceDataParseModel, string>((d, v) => d.Timestamp = d.Timestamp?.Add(TimeSpan.Parse(v, CultureInfo.InvariantCulture))),
            [2] = new Action<RaceDataParseModel, string>((d, v) => d.RaceId = v),
            [3] = new Action<RaceDataParseModel, string>((d, v) => d.Round = v),
            [4] = new Action<RaceDataParseModel, string>((d, v) => d.RacerId = v),
            [5] = new Action<RaceDataParseModel, string>((d, v) => d.Lane = v?.ToLowerInvariant()),
            [6] = new Action<RaceDataParseModel, string>((d, v) => d.DialIn = TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [7] = new Action<RaceDataParseModel, string>((d, v) => d.ReactionTime = TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [8] = new Action<RaceDataParseModel, string>((d, v) => d.SixtyFeetTime = TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [9] = new Action<RaceDataParseModel, string>((d, v) => d.ThreeThirtyFeetTime = TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [10] = new Action<RaceDataParseModel, string>((d, v) => d.SixSixtyFeetTime = TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [11] = new Action<RaceDataParseModel, string>((d, v) => d.SixSixtyFeetSpeed = double.Parse(v, CultureInfo.InvariantCulture)),
            [12] = new Action<RaceDataParseModel, string>((d, v) => d.ThousandFeetTime = TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [13] = new Action<RaceDataParseModel, string>((d, v) => d.ThousandFeetSpeed = double.Parse(v, CultureInfo.InvariantCulture)),
            [14] = new Action<RaceDataParseModel, string>((d, v) => d.FinishTime = TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [15] = new Action<RaceDataParseModel, string>((d, v) => d.FinishSpeed = double.Parse(v, CultureInfo.InvariantCulture)),
            [16] = new Action<RaceDataParseModel, string>((d, v) => d.Result = string.IsNullOrEmpty(v) ? RaceResult.Undefined : (RaceResult)Enum.Parse(typeof(RaceResult), v, true)),
        }.ToImmutableDictionary();

        public ParseResult Parse(string row)
        {
            var hash = GetHash(row);
            var columns = row.Split('|');
            var data = new RaceDataParseModel();

            var results = columns
                .Select((x, i) => columns[i]?.Trim() ?? string.Empty)
                .Select((x, i) => Result.Try(() => _parsers[i](data, x), y => $"Parsing failed for column '{i}' with message '{y.Message}': {x} {row}"))
                .ToImmutableArray();

            var errors = results
                .Select(x => x.Failure().ValueOrDefault())
                .Where(x => !string.IsNullOrEmpty(x))
                .ToImmutableArray();

            return new ParseResult(data, errors, hash);
        }

        private static string GetHash(string data)
        {
            //using var hashAlgo = new SHA256();
            using var hashAlgo = SHA256.Create();

            var bytes = Encoding.UTF8.GetBytes(data);
            var hashBytes = hashAlgo.ComputeHash(bytes);
            var hash = Encoding.UTF8.GetString(hashBytes);

            return hash;
        }

        public class ParseResult
        {
            public ParseResult(RaceDataParseModel raceData, ImmutableArray<string> errors, string hashcode)
            {
                RaceData = raceData;
                Errors = errors;
                Hashcode = hashcode;
            }

            public RaceDataParseModel RaceData { get; }
            public ImmutableArray<string> Errors { get; }
            public string Hashcode { get; }
        }
    }
}
