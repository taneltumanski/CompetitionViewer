using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompetitionViewer.Web.Controllers
{
    [Authorize]
    [ApiController]
    [Route("[controller]")]
    public class RaceController
    {
    }
}
