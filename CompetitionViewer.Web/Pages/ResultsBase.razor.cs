using CompetitionViewer.Services;
using Microsoft.AspNetCore.Components;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Reactive.Linq;
using System.Reactive.Threading.Tasks;
using System.Threading.Tasks;
using System.Reactive;
using Blazor.Extensions;
using Microsoft.JSInterop;

namespace CompetitionViewer.Web.Pages
{
    public class ResultsBase : ComponentBase
    {
        [Inject]
        private HubConnectionBuilder _hubConnectionBuilder { get; set; }

        protected List<RaceData> RaceResults { get; private set; }

        protected override Task OnInitAsync()
        {
            try
            {
                var connection = _hubConnectionBuilder
                .WithUrl("https://localhost:44368/liveresults", opt =>
                {
                    opt.LogLevel = SignalRLogLevel.Trace;
                    opt.Transport = HttpTransportType.WebSockets;
                })
                .Build();

                connection.On<RaceData>("DataReceived", DataReceived);

                return connection.StartAsync();
            }
            catch (Exception e)
            {

                throw;
            }
        }

        private Task DataReceived(RaceData data)
        {
            RaceResults.Add(data);

            return Task.CompletedTask;
        }
    }
}
