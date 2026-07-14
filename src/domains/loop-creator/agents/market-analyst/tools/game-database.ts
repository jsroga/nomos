/**
 * Game Database Tool
 *
 * Queries game databases (IGDB, etc.) for metadata and similar games.
 */

import { z } from 'zod'
import { GameDatabaseEntry } from '../types'
import { createLoopStructuredTool } from './structured-tool'

const gameDatabaseSchema = z.object({
  query: z.string().describe('Game name or genre to search for'),
  searchType: z.enum(['game', 'genre', 'similar']).describe('Type of search to perform'),
  limit: z.number().optional().describe('Maximum results to return (default 5)'),
})

/**
 * Game database tool for metadata lookup
 */
export const gameDatabaseTool = createLoopStructuredTool({
  name: 'game_database',
  description:
    'Query game databases for metadata, similar games, genres, and ratings. Use this to find comparable titles and understand genre conventions.',
  schema: gameDatabaseSchema,
  func: async input => {
    const { query, searchType, limit = 5 } = gameDatabaseSchema.parse(input)
    try {
      // In production, this would call IGDB API
      // For now, we'll use a curated database of reference games

      const gameDatabase: GameDatabaseEntry[] = [
        {
          id: 'vampire-survivors',
          name: 'Vampire Survivors',
          genres: ['roguelike', 'action', 'bullet-hell', 'survivors-like'],
          platforms: ['PC', 'Mobile', 'Console'],
          releaseDate: '2022-10-20',
          rating: 9.2,
          summary:
            'Minimalist roguelike where you fight endless hordes with auto-attacking weapons. Simple inputs, complex build decisions.',
          similarGames: ['Balatro', '20 Minutes Till Dawn', 'Halls of Torment'],
        },
        {
          id: 'hades',
          name: 'Hades',
          genres: ['roguelike', 'action', 'hack-and-slash'],
          platforms: ['PC', 'Console', 'Mobile'],
          releaseDate: '2020-09-17',
          rating: 9.4,
          summary:
            'Story-driven roguelike with tight combat and persistent narrative progression. Each run advances the story.',
          similarGames: ['Dead Cells', 'Curse of the Dead Gods', 'Hades II'],
        },
        {
          id: 'disco-elysium',
          name: 'Disco Elysium',
          genres: ['rpg', 'narrative', 'detective'],
          platforms: ['PC', 'Console'],
          releaseDate: '2019-10-15',
          rating: 9.6,
          summary:
            'Revolutionary narrative RPG with no combat. Dialogue-based gameplay with deep skill system representing internal thoughts.',
          similarGames: ['Planescape: Torment', 'Pentiment', 'Citizen Sleeper'],
        },
        {
          id: 'counter-strike-2',
          name: 'Counter-Strike 2',
          genres: ['fps', 'competitive', 'tactical-shooter'],
          platforms: ['PC'],
          releaseDate: '2023-09-27',
          rating: 8.5,
          summary:
            'Definitive competitive FPS with round-based economy, precise gunplay, and team coordination.',
          similarGames: ['Valorant', 'Rainbow Six Siege', 'Overwatch 2'],
        },
        {
          id: 'slay-the-spire',
          name: 'Slay the Spire',
          genres: ['roguelike', 'deck-builder', 'strategy'],
          platforms: ['PC', 'Console', 'Mobile'],
          releaseDate: '2019-01-23',
          rating: 9.1,
          summary:
            'Genre-defining deck-building roguelike. Build synergistic card decks while ascending a spire.',
          similarGames: ['Monster Train', 'Inscryption', 'Balatro'],
        },
        {
          id: 'balatro',
          name: 'Balatro',
          genres: ['roguelike', 'deck-builder', 'poker'],
          platforms: ['PC', 'Console', 'Mobile'],
          releaseDate: '2024-02-20',
          rating: 9.3,
          summary:
            'Poker-based roguelike deck builder. Create illegal poker hands with special jokers and modifiers.',
          similarGames: ['Slay the Spire', 'Luck Be a Landlord', 'Stacklands'],
        },
        {
          id: 'dead-cells',
          name: 'Dead Cells',
          genres: ['roguelike', 'metroidvania', 'action'],
          platforms: ['PC', 'Console', 'Mobile'],
          releaseDate: '2018-08-07',
          rating: 9.0,
          summary:
            'Fast-paced roguelike-metroidvania with tight combat and permanent progression unlocks.',
          similarGames: ['Hades', 'Hollow Knight', 'Blasphemous'],
        },
        {
          id: 'risk-of-rain-2',
          name: 'Risk of Rain 2',
          genres: ['roguelike', 'third-person-shooter', 'co-op'],
          platforms: ['PC', 'Console'],
          releaseDate: '2020-08-11',
          rating: 8.8,
          summary:
            '3D roguelike shooter with escalating difficulty and item stacking. Great for co-op.',
          similarGames: ['Gunfire Reborn', 'Deep Rock Galactic', 'GTFO'],
        },
        {
          id: 'cult-of-the-lamb',
          name: 'Cult of the Lamb',
          genres: ['roguelike', 'management', 'action'],
          platforms: ['PC', 'Console'],
          releaseDate: '2022-08-11',
          rating: 8.7,
          summary:
            'Combines roguelike dungeon crawling with cult management simulation. Build and maintain your flock.',
          similarGames: ['Hades', 'Don\'t Starve', 'Darkest Dungeon'],
        },
        {
          id: 'enter-the-gungeon',
          name: 'Enter the Gungeon',
          genres: ['roguelike', 'bullet-hell', 'twin-stick-shooter'],
          platforms: ['PC', 'Console'],
          releaseDate: '2016-04-05',
          rating: 8.5,
          summary:
            'Bullet-hell roguelike with hundreds of guns and synergies. Tight dodge-rolling mechanics.',
          similarGames: ['Nuclear Throne', 'The Binding of Isaac', 'Vampire Survivors'],
        },
      ]

      let results: GameDatabaseEntry[] = []
      const queryLower = query.toLowerCase()

      if (searchType === 'game') {
        // Search by game name
        results = gameDatabase.filter(
          g => g.name.toLowerCase().includes(queryLower) || g.id.includes(queryLower)
        )
      } else if (searchType === 'genre') {
        // Search by genre
        results = gameDatabase.filter(g => g.genres.some(genre => genre.includes(queryLower)))
      } else if (searchType === 'similar') {
        // Find games similar to query
        const targetGame = gameDatabase.find(g => g.name.toLowerCase().includes(queryLower))

        if (targetGame) {
          // Find games with overlapping genres
          results = gameDatabase.filter(
            g => g.id !== targetGame.id && g.genres.some(genre => targetGame.genres.includes(genre))
          )
        } else {
          // Search by genre keywords
          results = gameDatabase.filter(
            g =>
              g.genres.some(genre => queryLower.includes(genre)) ||
              g.summary.toLowerCase().includes(queryLower)
          )
        }
      }

      // Limit results
      results = results.slice(0, limit)

      return JSON.stringify({
        success: true,
        query,
        searchType,
        resultCount: results.length,
        results,
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Database query failed',
        results: [],
      })
    }
  },
})
