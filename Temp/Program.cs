using CompetitionViewer.Services;
using CompetitionViewer.Services.ResultsRequesters.EDRA;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Temp
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var service = new EDRAResultService(new DefaultHttpClientFactory());
            var raceId = "86";
            var results = await service.GetRaceData(new EDRAEventInfo(raceId, $"http://www.edra.ee/tulemused.php?eventID=" + raceId), CancellationToken.None);

            var temp = results
                .Select(x => x.RaceData)
                .Where(x => x.RacerId != "BYE")
                .Where(x => !x.RacerId.StartsWith("RWYB"))
                .OrderBy(x => x.Timestamp)
                .ToArray();

            var data = results
                .Select(x => x.RaceData)
                .Where(x => x.RacerId != "BYE")
                .Select(x => (x.Timestamp, x.RaceId, Class: GetClass(x.RacerId)))
                .Where(x => !x.Class.StartsWith("RWYB"))
                .GroupBy(x => (x.Timestamp, x.RaceId))
                .Select(x => x.First())
                .Select(x => (x.Timestamp, x.Class, RaceType: GetRaceType(x.Class)))
                .Distinct()
                .OrderBy(x => x.Timestamp.Value)
                .ToArray();

            var zipped = data
                .Zip(data.Skip(1))
                .Where(x => x.Second.Timestamp - x.First.Timestamp < TimeSpan.FromMinutes(4))
                .ToArray();

            foreach (var item in zipped)
            {
                var timeDiff = item.Second.Timestamp - item.First.Timestamp;
                var padLen = RaceType.Motorcycle.ToString().Length;

                Console.WriteLine($"{$"{item.First.RaceType}->{item.Second.RaceType}".PadRight(2*RaceType.Motorcycle.ToString().Length + 2)} time difference = {timeDiff}");
            }

            var carAverage = zipped
                .Where(x => x.First.RaceType == RaceType.Car && x.Second.RaceType == RaceType.Car)
                .Select(x => x.Second.Timestamp - x.First.Timestamp)
                .Select(x => x.Value)
                .ToArray();

            var motorcycleAverage = zipped
                .Where(x => x.First.RaceType == RaceType.Motorcycle && x.Second.RaceType == RaceType.Motorcycle)
                .Select(x => x.Second.Timestamp - x.First.Timestamp)
                .Select(x => x.Value)
                .ToArray();

            Console.WriteLine();
            
            if (carAverage.Any())
            {
                Console.WriteLine("Car average:        " + TimeSpan.FromSeconds(carAverage.Average(x => x.TotalSeconds)));
                Console.WriteLine("Car median:         " + TimeSpan.FromSeconds(GetMedian(carAverage.Select(x => x.TotalSeconds))));
                Console.WriteLine("Car best:           " + TimeSpan.FromSeconds(carAverage.Min(x => x.TotalSeconds)));
                Console.WriteLine("Car Worst:          " + TimeSpan.FromSeconds(carAverage.Max(x => x.TotalSeconds)));
            }

            if (motorcycleAverage.Any())
            {
                Console.WriteLine("Motorcycle average: " + TimeSpan.FromSeconds(motorcycleAverage.Average(x => x.TotalSeconds)));
                Console.WriteLine("Motorcycle median:  " + TimeSpan.FromSeconds(GetMedian(motorcycleAverage.Select(x => x.TotalSeconds))));
                Console.WriteLine("Motorcycle best:    " + TimeSpan.FromSeconds(motorcycleAverage.Min(x => x.TotalSeconds)));
                Console.WriteLine("Motorcycle worst:   " + TimeSpan.FromSeconds(motorcycleAverage.Max(x => x.TotalSeconds)));
            }
        }

        public static double GetMedian(IEnumerable<double> sourceNumbers)
        {
            //make sure the list is sorted, but use a new array
            var sortedPNumbers = sourceNumbers.OrderBy(x => x).ToArray();

            //get the median
            int size = sortedPNumbers.Length;
            int mid = size / 2;
            double median = (size % 2 != 0) ? (double)sortedPNumbers[mid] : ((double)sortedPNumbers[mid] + (double)sortedPNumbers[mid - 1]) / 2;
            return median;
        }

        private static RaceType GetRaceType(string raceClass)
        {
            var motorcycles = new[] { "PB", "SB", "BB" };
            if (motorcycles.Contains(raceClass))
            {
                return RaceType.Motorcycle;
            }

            return RaceType.Car;
        }

        private static string GetClass(string id)
        {
            if (id == null)
            {
                return null;
            }

            for (var i = id.Length - 1; i >= 0; i--)
            {
                var c = id[i];

                if (!(c >= '0' && c <= '9'))
                {
                    return id.Substring(0, i + 1);
                }
            }

            return id;
        }
    }

    internal enum RaceType
    {
        Invalid = 0,
        Car = 1,
        Motorcycle = 2
    }

    internal class DefaultHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name)
        {
            return new HttpClient();
        }
    }
}
