using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text;

namespace CompetitionViewer.Services
{
    public class BracketGenerator : IBracketGenerator
    {
        public Bracket<T> GenerateBracket<T, TKey, TProperty>(IEnumerable<T> participantResults, Func<T, TKey> keySelector, Func<T, TProperty> comparisonValueSelector, IBracketProvider bracketProvider, bool isAscendingOrder)
        {
            Func<IEnumerable<T>, IOrderedEnumerable<T>> orderFunction;

            if (isAscendingOrder)
            {
                orderFunction = new Func<IEnumerable<T>, IOrderedEnumerable<T>>(x => Enumerable.OrderBy(x, comparisonValueSelector));
            }
            else
            {
                orderFunction = new Func<IEnumerable<T>, IOrderedEnumerable<T>>(x => Enumerable.OrderByDescending(x, comparisonValueSelector));
            }

            var distinctParticipantResults = participantResults
                .GroupBy(keySelector)
                .Select(x => orderFunction(x).First());

            var orderedParticipants = orderFunction(distinctParticipantResults)
                .ToImmutableArray();

            return bracketProvider.GetBracket(orderedParticipants);
        }

        public Bracket<T> GenerateBracket<T, TProperty>(IEnumerable<T> participants, Func<T, TProperty> comparisonProperty)
        {
            throw new NotImplementedException();
        }
    }

    public interface IBracketGenerator
    {
        Bracket<T> GenerateBracket<T, TProperty>(IEnumerable<T> participants, Func<T, TProperty> comparisonProperty);
    }

    public interface IBracketProvider
    {
        Bracket<T> GetBracket<T>(ImmutableArray<T> participants);
    }

    public class EDRAStreetBracketProvider : IBracketProvider
    {
        public Bracket<T> GetBracket<T>(ImmutableArray<T> participants)
        {
            throw new NotImplementedException();
        }
    }

    public class Bracket<T>
    {
    }

    public class BracketGroup<T>
    {
        public string GroupId { get; }
        public string RoundId { get; }

        public T Participant1 { get; }
        public T Participant2 { get; }

        public T Winner { get; }

        public BracketGroup(string groupId, string roundId, T participant1, T participant2, T winner)
        {
            GroupId = groupId;
            RoundId = roundId;
            Participant1 = participant1;
            Participant2 = participant2;
            Winner = winner;
        }
    }
}
