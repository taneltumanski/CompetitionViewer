using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.IO;
using System.Linq;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using iText.Kernel.Pdf.Canvas.Parser.Listener;

namespace ConsoleApp1
{
    class Program
    {
        static void Main(string[] args)
        {
            var color = Console.ForegroundColor;
            var participants = 64;
            var participantLists = Enumerable.Range(2, participants - 1).ToArray();
            var brackets = participantLists
                .Select(x => new
                {
                    Count = x,
                    KnownBracket = GetKnownBracket(x).ToArray(),
                    Bracket = GetBracket(x).ToArray()
                })
                .ToArray();

            var isFail = false;

            foreach (var bracket in brackets)
            {
                var bracketList = bracket.KnownBracket;
                var result = Simulate(bracketList);
                Console.Write($"Bracket with {bracket.Count} is ");

                if (bracket.KnownBracket.SequenceEqual(bracketList) && result)
                {
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine("SUCCESS");
                }
                else if (bracketList.Length == 0)
                {
                    //isFail = true;
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine("-KNOWN BRACKET NOT FOUND-");
                }
                else if (!result)
                {
                    //isFail = true;
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("-SIMULATION FAILED-");
                }
                else
                {
                    isFail = true;
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("FAIL");
                }

                Console.ForegroundColor = color;
            }

            if (isFail)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("Bracket algorithm failed");
                Console.ForegroundColor = color;
            }

            Console.WriteLine();

            //foreach (var bracket in brackets)
            //{
            //    Console.WriteLine(bracket.Count + " = " + string.Join(", ", bracket.Bracket.Select(x => x == null ? " " : x.ToString())));
            //    Console.WriteLine(bracket.Count + " = " + string.Join(", ", bracket.KnownBracket.Select(x => x == null ? " " : x.ToString())));
            //    Console.WriteLine();
            //}

            //return;

            for (int i = 2; i <= 256; i++)
            {
                var count = i;
                var byes = GetByes(i).ToArray();
                var players = Enumerable.Range(1, count).Select(x => new Player() { Index = x, Name = x.ToString() }).ToArray();
                var matches = Generate(players.Length);

                //Console.WriteLine("----" + count + "----" + byes.Length + "----" + string.Join(" ", byes));

                //foreach (var match in matches)
                //{
                //    Console.WriteLine(string.Join(", ", match));
                //}
            }

        }

        private static bool Simulate(int?[] bracket)
        {
            var requredByeOrder = GetByes(bracket.Count(x => x != null)).ToImmutableArray();
            var requredByeOrder2 = Enumerable.Range(1, requredByeOrder.Length).ToImmutableArray();
            var matches = GetMatches(bracket);
            var byeOrder = new List<int>();
            var round = 1;

            while (matches != null)
            {
                var newBracket = new int?[matches.Length];

                for (int i = 0; i < matches.Length; i++)
                {
                    var match = matches[i];

                    if (match.first != null && match.second != null)
                    {
                        newBracket[i] = Math.Min(match.first.Value, match.second.Value);
                    }
                    else if (match.first != null || match.second != null)
                    {
                        var value = Math.Min(match.first ?? int.MaxValue, match.second ?? int.MaxValue);

                        newBracket[i] = value;
                        byeOrder.Add(round);
                    }
                    else
                    {
                        newBracket[i] = null;
                    }
                }

                matches = GetMatches(newBracket);
                round++;
            }

            return requredByeOrder.SequenceEqual(byeOrder);

            (int? first, int? second)[] GetMatches(int?[] bracket)
            {
                if (bracket.Length <= 1)
                {
                    return null;
                }

                var matches = new (int? first, int? second)[bracket.Length / 2];

                for (int i = 0; i < bracket.Length; i++)
                {
                    var matchIndex = i / 2;

                    if (i % 2 == 0)
                    {
                        matches[matchIndex].first = bracket[i];
                    }
                    else
                    {
                        matches[matchIndex].second = bracket[i];
                    }
                }

                return matches;
            }
        }

        private static IEnumerable<int> GetByes(int nr)
        {
            var round = 1;

            while (nr > 2)
            {
                if (nr % 2 != 0)
                {
                    yield return round;
                }
                
                nr = (int)Math.Ceiling(nr / 2d);
                round++;
            }
        }

        private static IEnumerable<int?> Generate(int participantsCount)
        {
            var rounds = (int)Math.Ceiling(Math.Log(participantsCount) / Math.Log(2));
            var bracketSize = Math.Pow(2, rounds);

            if (participantsCount < 2)
            {
                return Enumerable.Empty<int?>();
            }

            var matches = new List<List<int?>>() { new List<int?>() { 1, 2 } };

            for (var round = 1; round < rounds; round++)
            {
                var roundMatches = new List<List<int?>>();
                var sum = (int?)(Math.Pow(2, round + 1) + 1);

                foreach (var match in matches)
                {
                    var home = changeIntoBye(match[0], participantsCount);
                    var away = changeIntoBye(sum - match[0], participantsCount);

                    roundMatches.Add(new List<int?>() { home, away });

                    home = changeIntoBye(match[1], participantsCount);
                    away = changeIntoBye(sum - match[1], participantsCount);

                    roundMatches.Add(new List<int?>() { home, away });
                }

                matches = roundMatches;
            }

            return matches.SelectMany(x => x);
        }

        public static int? changeIntoBye(int? seed, int participantsCount)
        {
            return seed <= participantsCount ? seed : null;
        }

        public static IEnumerable<int?> GetBracket(int participantCount)
        {
            var rounds = (int)Math.Ceiling(Math.Log(participantCount) / Math.Log(2));
            var bracketSize = (int)Math.Pow(2, rounds);
            var seeds = Enumerable.Range(1, bracketSize).Select(x => new Seed()).ToArray();
            var byes = GetByes(participantCount).ToArray();

            var currentByePosition = 1;
            var currentRound = rounds;

            while (rounds > 0)
            {


                rounds--;
            }

            return seeds.Select(x => x.IsSet ? x.Value : (int?)null);
        }

        public static bool IsPowerOfTwo(int x)
        {
            return (x > 0) && ((x & (x - 1)) == 0);
        }

        private class Seed
        {
            public int Value { get; set; }
            public bool IsSet => Value > 0;
        }

        public static IEnumerable<int?> GetKnownBracket(int participantCount)
        {
            var items = new Dictionary<int, string>()
            {
                [2]  = "1 2",
                [3]  = "1 x 2 3",
                [4]  = "1 3 2 4",
                [5]  = "1 x 3 5 2 4 x x",
                [6]  = "1 4 x x 2 5 3 6",
                [7]  = "1 x 3 6 2 5 4 7",
                [8]  = "1 5 3 7 2 6 4 8",
                [9]  = "1 x 4 8 2 6 x x 3 7 5 9 x x x x",
                [10] = "1 6 x x 3 8 5 10 2 7 4 9 x x x x",
                [11] = "1 x 4 9 3 8 6 11 2 7 5 10 x x x x",
                [12] = "1 7 4 10 x x x x 2 8 5 11 3 9 6 12",
                [13] = "1 x 5 11 3 9 6 12 2 8 x x 4 10 7 13",
                [14] = "1 8 x x 3 10 6 13 2 9 5 12 4 11 7 14",
                [15] = "1 x 5 12 3 10 7 14 2 9 6 13 4 11 8 15",
                [16] = "1 9 5 13 7 15 3 11 2 10 6 14 8 16 4 12",
                [17] = "1 x 6 14 4 12 8 16 x x x x x x x x 2 10 x x 5 13 9 17 3 11 7 15 x x x x",
                [18] = "1 10 x x 4 13 8 17 2 11 6 15 x x x x 3 12 7 16 5 14 9 18 x x x x x x x x",
                [19] = "1 x 6 15 4 13 9 18 2 11 7 16 x x x x 3 12 8 17 5 14 10 19 x x x x x x x x",
                [20] = "1 11 6 16 x x x x 3 13 8 18 5 15 10 20 2 12 7 17 4 14 9 19 x x x x x x x x",
                [21] = "",
                [22] = "",
                [23] = "",
                [24] = "",
                [25] = "",
                [26] = "",
                [27] = "",
                [28] = "",
                [29] = "",
                [30] = "",
                [31] = "",
                [32] = "",
                [33] = "",
                [34] = "",
                [35] = "",
                [36] = "",
                [37] = "",
                [38] = "",
                [39] = "",
                [40] = "",
                [41] = "",
                [42] = "",
                [43] = "",
                [44] = "",
                [45] = "",
                [46] = "",
                [47] = "",
                [48] = "",
                [49] = "",
                [50] = "",
                [51] = "",
                [52] = "",
                [53] = "",
                [54] = "",
                [55] = "",
                [56] = "",
                [57] = "",
                [58] = "",
                [59] = "",
                [60] = "",
                [61] = "",
                [62] = "",
                [63] = "",
                [64] = "",
            };
            
            if (items.TryGetValue(participantCount, out var data))
            {
                return data.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(x => x == "x" ? (int?)null : int.Parse(x)).ToArray();
            } 

            return Enumerable.Empty<int?>();
        }
    }

    public class Match
    {
        public int Round { get; private set; }
        public int MatchIndex { get; set; }
        public Match NextMatch { get; private set; }
        public Player? Winner { get; private set; }

        public Player? Player1 { get; set; }
        public Player? Player2 { get; set; }

        public void SetWinner(Player player)
        {
            Winner = player;
            //NextMatch?.
        }
        

        public override string ToString()
        {
            return "(" + Player1 + ", " + Player2 + ")";
        }
    }

    public struct Player
    {
        public string Name { get; set; }
        public int Index { get; set; }

        public override string ToString()
        {
            return Name + ": " + Index;
        }
    }

    public class Bracket
    {
        public IEnumerable<Match> Matches { get; set; }

        public void SetWinner(Player player)
        {

        }
    }
}
