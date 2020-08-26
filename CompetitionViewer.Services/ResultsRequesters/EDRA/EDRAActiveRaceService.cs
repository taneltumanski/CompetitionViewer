using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;

namespace CompetitionViewer.Services.ResultsRequesters.EDRA
{
    public class EDRAActiveRaceService : BackgroundService
    {
        private readonly EDRAResultService _resultService;

        public EDRAActiveRaceService(EDRAResultService resultService)
        {
            _resultService = resultService;
        }

        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            throw new NotImplementedException();
        }
    }
}
