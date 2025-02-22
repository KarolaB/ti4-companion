using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Server.Domain;
using Server.Persistence;
using System.Collections.Generic;
using System.Linq;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExplorationCardsController : ControllerBase
    {
        private readonly ILogger<ExplorationCardsController> logger;
        private readonly SessionContext sessionContext;

        public ExplorationCardsController(ILogger<ExplorationCardsController> logger, SessionContext sessionContext)
        {
            this.logger = logger;
            this.sessionContext = sessionContext;
        }

        [HttpGet]
        public IEnumerable<ExplorationCardDto> GetObjectives()
        {
            var objectivesFromDb = this.sessionContext.Explorations.ToList();

            return objectivesFromDb.Select(fromDb => new ExplorationCardDto(fromDb)).OrderBy(f => f.PlanetType);
        }
    }

    public class ExplorationCardDto : Exploration
    {
        public ExplorationCardDto(Exploration exploration)
        {
            this.Slug = exploration.Slug;
            this.GameVersion = exploration.GameVersion;
            this.PlanetType = exploration.PlanetType;
            this.NumberOfCards = exploration.NumberOfCards;
            this.Resources = exploration.Resources;
            this.Influence = exploration.Influence;
            this.TechSkip = exploration.TechSkip;
        }
    }
}
