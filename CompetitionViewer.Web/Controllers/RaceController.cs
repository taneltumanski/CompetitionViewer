using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using CompetitionViewer.Services;
using CompetitionViewer.Web.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CompetitionViewer.Web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RaceController : ControllerBase
    {
        private readonly IRaceUpdateService _raceUpdateService;
        private readonly IRaceService _raceService;

        public RaceController(IRaceUpdateService raceUpdateService, IRaceService raceService)
        {
            _raceUpdateService = raceUpdateService;
            _raceService = raceService;
        }

        [HttpGet("start")]
        public async Task<IActionResult> StartService()
        {
            await _raceUpdateService.Start();

            return Ok();
        }

        [HttpGet("event")]
        public async Task<IActionResult> GetEvents()
        {
            await _raceUpdateService.Start();

            var data = _raceService
                .GetEvents()
                .Select(Mapper.FromDto);

            return Ok(data);
        }

        [HttpGet("event/{eventId}")]
        public async Task<IActionResult> GetEventData([FromRoute] string eventId)
        {
            await _raceUpdateService.Start();

            var data = _raceService
                .GetEventData(eventId)
                .Select(Mapper.FromDto);

            return Ok(data);
        }

        [HttpGet("event/all")]
        public async Task<IActionResult> GetAllEventsData()
        {
            await _raceUpdateService.Start();

            var data = _raceService
                .GetAllEventData()
                .Select(Mapper.FromDto);

            return Ok(data);
        }

        [HttpGet("event/latest")]
        public async Task<IActionResult> GetLatestEventData()
        {
            await _raceUpdateService.Start();

            var data = _raceService
                .GetLatestEventData()
                .Select(Mapper.FromDto);

            return Ok(data);
        }
    }
}
