using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;

namespace Server.Domain
{
    public class GameEvent
    {
        public const string GameStarted = "GameStarted";

        public const string MapAdded = "MapAdded";
        public const string TimelineUserEvent = "TimelineUserEvent";

        public Guid Id { get; set; }

        public Guid SessionId { get; set; }

        public DateTimeOffset HappenedAt { get; set; }

        public string EventType { get; set; }

        public string SerializedPayload { get; set; }

        public static GameEvent GenerateOrderEvent(Guid sessionId, GameStartedPayload payload, int rounds, DateTimeOffset when, bool addForSpeaker)
        {
            var randomizedPlayerOrder = Enumerable.Range(0, payload.Options.Players.Length).ToList();
            randomizedPlayerOrder.Shuffle();
            var reversedPlayerOrder = new List<int>();
            reversedPlayerOrder.AddRange(randomizedPlayerOrder);
            reversedPlayerOrder.Reverse();
            List<int> order = Enumerable.Range(0, rounds).SelectMany(round =>
            {
                if (round % 2 == 0)
                {
                    return randomizedPlayerOrder;
                }

                return reversedPlayerOrder;
            }).ToList();
            if (addForSpeaker && payload.Options.SpeakerPick)
            {
                order.Add(-1);
            }

            return new GameEvent
            {
                SessionId = sessionId,
                HappenedAt = when,
                EventType = "PlayerOrder",
                SerializedPayload = JsonConvert.SerializeObject(order),
            };
        }
    }

    internal static class Extensions
    {
        // https://stackoverflow.com/questions/273313/randomize-a-listt
        public static void Shuffle<T>(this IList<T> list)
        {
            RNGCryptoServiceProvider provider = new RNGCryptoServiceProvider();
            int n = list.Count;
            while (n > 1)
            {
                byte[] box = new byte[1];
                do
                {
                    provider.GetBytes(box);
                }
                while (!(box[0] < n * (byte.MaxValue / n)));
                int k = box[0] % n;
                n--;
                T value = list[k];
                list[k] = list[n];
                list[n] = value;
            }
        }
    }
}
