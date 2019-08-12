using CompetitionViewer.Services;
using HtmlAgilityPack;
using OfficeOpenXml;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace DragParsement
{
    class Program
    {
        public class Temp
        {
            public static void Test()
            {
                var participants = new[]
                {
                new P(4, "Tanel"),
                new P(2, "Peeter"),
                new P(3, "Joonatan"),
                new P(1, "Tanel"),
                new P(5, "Peeter")
            };

                var gen = new BracketGenerator();
                var provider = new EDRAStreetBracketProvider();
                var bracket = gen.GenerateBracket(participants, x => x.Name, x => x.Value, provider, true);
            }

            private class P
            {
                public int Value { get; }
                public string Name { get; }

                public P(int value, string name)
                {
                    Value = value;
                    Name = name;
                }
            }
        }

        static async Task Main(string[] args)
        {
            //Temp.Test();

            //return;
            var idsToFind = new[] { "SB123", "BB123" };
            var baseUrl = "http://www.edra.ee/tulemused.php?eventID={0}";
            var eventIds = Enumerable
                .Range(67, 1)
                .Select(x => x.ToString())
                .ToArray();

            //eventIds = new[] { "64" };

            using (var client = new HttpClient())
            {
                var results = new List<RaceData>();

                foreach (var eventId in eventIds)
                {
                    var fullUrl = string.Format(baseUrl, eventId);
                    var html = string.Empty;

                    try
                    {
                        var cacheDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "DragParsement");
                        var urlKey = baseUrl.GetHashCode();
                        var fileName = "DragEvent_" + eventId + "_" + urlKey + ".data";
                        var filePath = Path.Combine(cacheDirectory, fileName);

                        Console.WriteLine("Loading " + eventId);

                        try
                        {
                            if (File.Exists(filePath) && (DateTime.Now - File.GetLastWriteTimeUtc(filePath)) < TimeSpan.FromDays(1))
                            {
                                html = File.ReadAllText(filePath);
                                Console.WriteLine("Loaded data from cache");
                            }
                        }
                        catch (Exception e)
                        {
                            Console.WriteLine("Failed to load from cache: " + e.Message);
                        }

                        if (string.IsNullOrEmpty(html))
                        {
                            if (!Directory.Exists(cacheDirectory))
                            {
                                Directory.CreateDirectory(cacheDirectory);
                            }

                            html = await client.GetStringAsync(fullUrl);
                            File.WriteAllText(filePath, html);
                            Console.WriteLine("Loaded data from web");
                        }
                        
                        Console.WriteLine("Loaded " + eventId);

                        if (string.IsNullOrEmpty(html))
                        {
                            continue;
                        }

                        Console.WriteLine("Parsing " + eventId);
                        var eventResults = ParseHtml(html, eventId).ToArray();
                        Console.WriteLine("Parsed " + eventId + ", found " + eventResults.Length + " results");

                        results.AddRange(eventResults);
                    }
                    catch (Exception e)
                    {
                        Console.WriteLine("ERROR: " + e.Message);
                    }
                }

                var racerResults = results
                    .Where(x => x.RacerId != "BYE")
                    .Where(x => x.FinishTime > TimeSpan.Zero)
                    .Where(x => x.Result != RaceResult.Undefined)
                    .Distinct()
                    //.Where(x => Regex.IsMatch(x.RacerId, @"(SB|BB|PB)\d*"))
                    //.GroupBy(x => x.RacerId)
                    //.Where(x => idsToFind.Contains(x.RacerId))
                    .ToArray();

                var longestRacerId = racerResults
                    .Select(x => x.RacerId.Length)
                    .DefaultIfEmpty(0)
                    .Max();

                Console.WriteLine("Found " + racerResults.Length + " racer results");

                var selector = CreateSelector(x => x.FinishTime);
                var grouping = new Func<IEnumerable<RaceData>, IEnumerable<RaceData>>(x => x.OrderBy(selector));

                var orderedResults = grouping(racerResults);
                var i = 1;

                foreach (var result in orderedResults)
                {
                    var bg = Console.BackgroundColor;
                    if (idsToFind.Contains(result.RacerId))
                    {
                        Console.BackgroundColor = ConsoleColor.DarkGreen;
                    }
                    Console.WriteLine($"{result.Timestamp.ToString("yyyy-MM-dd HH:mm:ss")} {result.RaceId.PadRight(7)} | {(i++.ToString() + ".").PadRight(5)} {result.RacerId.PadRight(longestRacerId)} {((result.ReactionTime < TimeSpan.Zero ? "-" : " ") + result.ReactionTime.ToString("s\\.fffff")).PadRight(9)} {result.FinishTime.ToString("s\\.fffff").PadRight(8)} {result.FinishSpeed.ToString("0.0").PadRight(5)} {(result.FinishTime + result.ReactionTime).ToString("s\\.fffff").PadRight(8)} {result.Result.ToString().PadRight(8)} {(result.DialIn > TimeSpan.Zero ? (((result.FinishTime + result.ReactionTime - result.DialIn) < TimeSpan.Zero ? "-" : " ") + (result.FinishTime + result.ReactionTime - result.DialIn).ToString("s\\.fffff")) : string.Empty)} {result.DialIn.ToString("s\\.fffff")} {result.EventId} {result.Row}");
                    Console.BackgroundColor = bg;
                }

                var test = results
                    .GroupBy(x => x.RaceId)
                    .Where(x => x.Any())
                    .Where(x => x.Any(y => y.Result != RaceResult.Undefined))
                    .Where(x => x.Any(y => y.FinishTime > TimeSpan.Zero))
                    .Where(x => x.Count() == 2)
                    .Select(x => new
                    {
                        Id = x.Key,
                        Time = x.First().Timestamp,
                        Lane1 = x.OrderBy(y => y.Result).First(),
                        Lane2 = x.OrderBy(y => y.Result).Skip(1).First(),
                    })
                    .Select(x => new
                    {
                        x.Id,
                        x.Time,
                        x.Lane1,
                        x.Lane2,
                        Difference = x.Lane2.ReactionTime + x.Lane2.FinishTime - x.Lane1.ReactionTime - x.Lane1.FinishTime
                    })
                    //.Where(x => idsToFind.Contains(x.Lane1.RacerId) || idsToFind.Contains(x.Lane2.RacerId))
                    .Where(x => x.Lane1.DialIn == TimeSpan.Zero)
                    .Where(x => x.Lane2.RacerId != "BYE")
                    .OrderBy(x => x.Difference)
                    //.Where(x => x.Time >= new DateTimeOffset(new DateTime(2019, 7, 10)))
                    .Where(x => x.Lane1.ReactionTime >= TimeSpan.Zero && x.Lane2.ReactionTime >= TimeSpan.Zero)
                    .Where(x => x.Lane1.FinishTime >= TimeSpan.Zero && x.Lane2.FinishTime >= TimeSpan.Zero)
                    .Where(x => x.Lane1.Round.StartsWith('E'))
                    .Where(x => !x.Lane1.RacerId.StartsWith("RWYB"))
                    .Where(x => x.Difference >= TimeSpan.Zero)
                    .OrderByDescending(x => Math.Abs(x.Lane1.ReactionTime.Ticks - x.Lane2.ReactionTime.Ticks))
                    .ToArray();

                i = 1;

                Console.WriteLine();

                foreach (var result in test)
                {
                    var bg = Console.BackgroundColor;
                    if (idsToFind.Contains(result.Lane1.RacerId) || idsToFind.Contains(result.Lane2.RacerId))
                    {
                        Console.BackgroundColor = ConsoleColor.DarkGreen;
                    }
                    else if (result.Lane1.RacerId.StartsWith("SB") || result.Lane1.RacerId.StartsWith("BB") || result.Lane1.RacerId.StartsWith("PB") || Regex.IsMatch(result.Lane1.RacerId, @"S\d+"))
                    {
                        Console.BackgroundColor = ConsoleColor.DarkBlue;
                    }
                    //Console.WriteLine($"{result.Time.ToString("yyyy-MM-dd HH:mm:ss")} {(i++.ToString() + ".").PadRight(5)} {result.Id.PadRight(7)} | {result.Lane1.Round.PadRight(5)} {((result.Lane1.ReactionTime < TimeSpan.Zero ? "-" : " ") + result.Lane1.ReactionTime.ToString("s\\.fffff")).PadRight(7)} {result.Lane1.FinishTime.ToString("s\\.fffff").PadRight(8)} WINNER {result.Lane1.RacerId.PadRight(longestRacerId)} | {result.Lane2.RacerId.PadRight(longestRacerId)} RUNNERUP {((result.Lane2.ReactionTime < TimeSpan.Zero ? "-" : " ") + result.Lane2.ReactionTime.ToString("s\\.fffff")).PadRight(7)} {result.Lane2.FinishTime.ToString("s\\.fffff").PadRight(8)} {((result.Difference < TimeSpan.Zero ? "-" : " ") + result.Difference.ToString("s\\.fffff")).PadRight(8)}");
                    Console.BackgroundColor = bg;
                }

                Console.WriteLine(test.Length);

                var events = results.Select(x => x.EventId).Distinct().ToArray();

                var raceNumbers = events
                    .Select(e => new
                    {
                        Id = e,
                        Numbers = results
                            .Where(x => x.EventId == e)
                            .Select(x => x.RaceId)
                            .Distinct()
                            .Select(x => int.Parse(x))
                            .ToHashSet()
                    })
                    .Select(x => new
                    {
                        EventId = x.Id,
                        All = x.Numbers.OrderBy(y => y).ToArray(),
                        Missing = Enumerable.Range(x.Numbers.Min(), x.Numbers.Max() - x.Numbers.Min())
                            .Where(y => !x.Numbers.Contains(y))
                            .ToArray()
                    })
                    .ToArray();

                foreach (var item in raceNumbers)
                {
                    Console.WriteLine($"MISSING from {item.EventId} {item.Missing.Length}");
                }

                var myResults = results
                    .Where(x => x.RacerId != "BYE")
                    .Where(x => x.FinishTime > TimeSpan.Zero)
                    .Where(x => x.Result != RaceResult.Undefined)
                    .OrderBy(x => x.Timestamp)
                    .Distinct()
                    .Where(x => idsToFind.Contains(x.RacerId))
                    .ToArray();

                Console.WriteLine("Found " + myResults.Length + " my results");

                using (var excel = new ExcelPackage())
                {
                    var columns = new List<Func<RaceData, object>>()
                    {
                        x => x.Timestamp,
                        x => x.ReactionTime.TotalSeconds,
                        x => x.SixtyFeetTime.TotalSeconds,
                        x => x.ThreeThirtyFeetTime.TotalSeconds,
                        x => x.SixtyFeetTime.TotalSeconds,
                        x => x.SixSixtyFeetSpeed,
                        x => x.ThousandFeetTime.TotalSeconds,
                        x => x.ThousandFeetSpeed,
                        x => x.FinishTime.TotalSeconds,
                        x => x.FinishSpeed
                    };

                    var wb = excel.Workbook.Worksheets.Add("drag");
                    var row = 2;

                    wb.Cells[1, 1].Value = "Time";
                    wb.Cells[1, 2].Value = "Reaction";
                    wb.Cells[1, 3].Value = "60ft";
                    wb.Cells[1, 4].Value = "330ft";
                    wb.Cells[1, 5].Value = "660ft";
                    wb.Cells[1, 6].Value = "660ft speed";
                    wb.Cells[1, 7].Value = "1000ft";
                    wb.Cells[1, 8].Value = "1000ft speed";
                    wb.Cells[1, 9].Value = "ET";
                    wb.Cells[1, 10].Value = "ET speed";

                    foreach (var result in myResults)
                    {
                        for (int col = 0; col < columns.Count; col++)
                        {
                            wb.Cells[row, col + 1].Value = columns[col](result);
                        }

                        row++;
                    }

                    Directory.CreateDirectory(@"C:\Users\tanel.tumanski\Desktop\drag");

                    using (var stream = File.OpenWrite(@"C:\Users\tanel.tumanski\Desktop\drag\data.xlsx"))
                    {
                        excel.SaveAs(stream);
                    }    
                }

                Console.WriteLine("Created file");
            }
        }

        private static Func<RaceData, T> CreateSelector<T>(Func<RaceData, T> func)
        {
            return func;
        }

        private static IEnumerable<RaceData> ParseHtml(string html, string eventId)
        {
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var table = doc.DocumentNode.Descendants("table").Single();
            var rows = table.Descendants("tr").Skip(1).ToArray();

            int i = 1;

            foreach (var row in rows)
            {
                yield return ParseRow(row, i++, eventId);
            }
        }

        private static RaceData ParseRow(HtmlNode row, int rowId, string eventId)
        {
            var columns = row.Descendants("td").ToArray();
            var parsers = new Dictionary<int, Action<RaceData, string>>()
            {
                [0] = new Action<RaceData, string>((d, v) => d.Timestamp = string.IsNullOrEmpty(v) ? DateTimeOffset.MinValue : DateTimeOffset.ParseExact(v, "dd.MM.yyyy", CultureInfo.InvariantCulture)),
                [1] = new Action<RaceData, string>((d, v) => d.Timestamp = string.IsNullOrEmpty(v) ? d.Timestamp : d.Timestamp.Add(TimeSpan.Parse(v, CultureInfo.InvariantCulture))),
                [2] = new Action<RaceData, string>((d, v) => d.RaceId = v),
                [3] = new Action<RaceData, string>((d, v) => d.Round = v),
                [4] = new Action<RaceData, string>((d, v) => d.RacerId = v),
                [5] = new Action<RaceData, string>((d, v) => d.Lane = string.IsNullOrEmpty(v) ? RaceLane.Undefined : Enum.Parse<RaceLane>(v, true)),
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
                [16] = new Action<RaceData, string>((d, v) => d.Result = string.IsNullOrEmpty(v) ? RaceResult.Undefined : Enum.Parse<RaceResult>(v, true)),
            };

            var data = new RaceData()
            {
                Row = rowId,
                EventId = eventId
            };

            for (int i = 0; i < columns.Length; i++)
            {
                var value = columns[i].InnerText.Trim();

                try
                {
                    parsers[i](data, value);
                }
                catch (Exception e)
                {
                    Console.WriteLine("Parse failed for value " + value + " with parser id " + i);
                }
            }

            return data;
        }
    }

    public class RaceData : IEquatable<RaceData>
    {
        public DateTimeOffset Timestamp { get; set; }
        public string RaceId { get; set; }
        public string Round { get; set; }
        public string RacerId { get; set; }
        public RaceLane Lane { get; set; }
        public TimeSpan DialIn { get; set; }
        public TimeSpan ReactionTime { get; set; }
        public TimeSpan SixtyFeetTime { get; set; }
        public TimeSpan ThreeThirtyFeetTime { get; set; }
        public TimeSpan SixSixtyFeetTime { get; set; }
        public double SixSixtyFeetSpeed { get; set; }
        public TimeSpan ThousandFeetTime { get; set; }
        public double ThousandFeetSpeed { get; set; }
        public TimeSpan FinishTime { get; set; }
        public double FinishSpeed { get; set; }
        public RaceResult Result { get; set; }
        public RaceType RaceType { get; set; }

        public int Row { get; set; }
        public string EventId { get; set; }

        public TimeSpan RTPlusET => ReactionTime + FinishTime;

        public override bool Equals(object obj)
        {
            return Equals(obj as RaceData);
        }

        public bool Equals(RaceData other)
        {
            return other != null &&
                   Timestamp.Equals(other.Timestamp) &&
                   RaceId == other.RaceId &&
                   Round == other.Round &&
                   RacerId == other.RacerId &&
                   Lane == other.Lane &&
                   DialIn.Equals(other.DialIn) &&
                   ReactionTime.Equals(other.ReactionTime) &&
                   SixtyFeetTime.Equals(other.SixtyFeetTime) &&
                   ThreeThirtyFeetTime.Equals(other.ThreeThirtyFeetTime) &&
                   SixSixtyFeetTime.Equals(other.SixSixtyFeetTime) &&
                   SixSixtyFeetSpeed == other.SixSixtyFeetSpeed &&
                   ThousandFeetTime.Equals(other.ThousandFeetTime) &&
                   ThousandFeetSpeed == other.ThousandFeetSpeed &&
                   FinishTime.Equals(other.FinishTime) &&
                   FinishSpeed == other.FinishSpeed &&
                   Result == other.Result;
        }

        public override int GetHashCode()
        {
            var hash = new HashCode();
            hash.Add(Timestamp);
            hash.Add(RaceId);
            hash.Add(Round);
            hash.Add(RacerId);
            hash.Add(Lane);
            hash.Add(DialIn);
            hash.Add(ReactionTime);
            hash.Add(SixtyFeetTime);
            hash.Add(ThreeThirtyFeetTime);
            hash.Add(SixSixtyFeetTime);
            hash.Add(SixSixtyFeetSpeed);
            hash.Add(ThousandFeetTime);
            hash.Add(ThousandFeetSpeed);
            hash.Add(FinishTime);
            hash.Add(FinishSpeed);
            hash.Add(Result);
            return hash.ToHashCode();
        }

        public static bool operator ==(RaceData left, RaceData right)
        {
            return EqualityComparer<RaceData>.Default.Equals(left, right);
        }

        public static bool operator !=(RaceData left, RaceData right)
        {
            return !(left == right);
        }
    }

    public enum RaceType
    {
        Undefined = 0,
        QuarterMile = 1,
        EigthMile = 2
    }

    public enum RaceResult
    {
        Invalid = 0,
        Undefined = 0,
        Winner = 1,
        RunnerUp = 2
    }

    public enum RaceLane
    {
        Invalid = 0,
        Undefined = 0,
        Left = 1,
        Right = 2
    }
}
