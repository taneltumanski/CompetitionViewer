using HtmlAgilityPack;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Globalization;
using System.Linq;
using System.Text;

namespace CompetitionViewer.Services
{
    public class EDRADragParser
    {
        private readonly ImmutableDictionary<int, Action<RaceData, string>> _parsers = new Dictionary<int, Action<RaceData, string>>()
        {
            [0] = new Action<RaceData, string>((d, v) => d.Timestamp = string.IsNullOrEmpty(v) ? DateTimeOffset.MinValue : DateTimeOffset.ParseExact(v, "dd.MM.yyyy", CultureInfo.InvariantCulture)),
            [1] = new Action<RaceData, string>((d, v) => d.Timestamp = string.IsNullOrEmpty(v) ? d.Timestamp : d.Timestamp.Add(TimeSpan.Parse(v, CultureInfo.InvariantCulture))),
            [2] = new Action<RaceData, string>((d, v) => d.RaceId = v),
            [3] = new Action<RaceData, string>((d, v) => d.Round = v),
            [4] = new Action<RaceData, string>((d, v) => d.RacerId = v),
            [5] = new Action<RaceData, string>((d, v) => d.Lane = string.IsNullOrEmpty(v) ? RaceLane.Undefined : (RaceLane)Enum.Parse(typeof(RaceLane), v, true)),
            [6] = new Action<RaceData, string>((d, v) => d.DialIn = string.IsNullOrEmpty(v) ? TimeSpan.Zero : TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [7] = new Action<RaceData, string>((d, v) => d.ReactionTime = string.IsNullOrEmpty(v) ? TimeSpan.Zero : TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [8] = new Action<RaceData, string>((d, v) => d.SixtyFeetTime = string.IsNullOrEmpty(v) ? TimeSpan.Zero : TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [9] = new Action<RaceData, string>((d, v) => d.ThreeThirtyFeetTime = string.IsNullOrEmpty(v) ? TimeSpan.Zero : TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [10] = new Action<RaceData, string>((d, v) => d.SixSixtyFeetTime = string.IsNullOrEmpty(v) ? TimeSpan.Zero : TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [11] = new Action<RaceData, string>((d, v) => d.SixSixtyFeetSpeed = string.IsNullOrEmpty(v) ? 0 : double.Parse(v, CultureInfo.InvariantCulture)),
            [12] = new Action<RaceData, string>((d, v) => d.ThousandFeetTime = string.IsNullOrEmpty(v) ? TimeSpan.Zero : TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [13] = new Action<RaceData, string>((d, v) => d.ThousandFeetSpeed = string.IsNullOrEmpty(v) ? 0 : double.Parse(v, CultureInfo.InvariantCulture)),
            [14] = new Action<RaceData, string>((d, v) => d.FinishTime = string.IsNullOrEmpty(v) ? TimeSpan.Zero : TimeSpan.FromSeconds(double.Parse(v, CultureInfo.InvariantCulture))),
            [15] = new Action<RaceData, string>((d, v) => d.FinishSpeed = string.IsNullOrEmpty(v) ? 0 : double.Parse(v, CultureInfo.InvariantCulture)),
            [16] = new Action<RaceData, string>((d, v) => d.Result = string.IsNullOrEmpty(v) ? RaceResult.Undefined : (RaceResult)Enum.Parse(typeof(RaceResult), v, true)),
        }.ToImmutableDictionary();

        public ParseResult<RaceData> Parse(string row)
        {
            var columns = row.Split('|');
            var data = new RaceData();
            var errors = new List<string>();

            for (int i = 0; i < columns.Length; i++)
            {
                var value = columns[i].Trim();

                try
                {
                    _parsers[i](data, value);
                }
                catch (Exception e)
                {
                    errors.Add($"Parsing failed for column '{i}' with message '{e.Message}': {value} {row}");
                }
            }

            return new ParseResult<RaceData>(data, errors);
        }
    }
}
