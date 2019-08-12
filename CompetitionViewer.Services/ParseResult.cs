using System.Collections.Generic;
using System.Collections.Immutable;

namespace CompetitionViewer.Services
{
    public class ParseResult<T>
    {
        public bool IsSuccess { get; }
        public T Result { get; }
        public ImmutableArray<string> Errors { get; }

        public ParseResult(T result) : this(true, result, null) { }
        public ParseResult(ImmutableArray<string> errors) : this(false, default, errors) { }
        public ParseResult(T result, IEnumerable<string> errors) : this(true, result, errors) { }
        private ParseResult(bool isSuccess, T result, IEnumerable<string> errors)
        {
            IsSuccess = isSuccess;
            Result = result;
            Errors = errors?.ToImmutableArray() ?? ImmutableArray<string>.Empty;
        }
    }
}
