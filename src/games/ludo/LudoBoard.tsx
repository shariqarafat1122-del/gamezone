// src/games/ludo/LudoBoard.tsx

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LudoRoom, LudoPiece, LudoColor } from '../../types/ludo.types';
import { getAbsolutePosition, isSafeSquare } from '../../controllers/LudoController';
import { SAFE_SQUARES } from '../../types/ludo.types';
import LudoPieceComponent from './LudoPiece';
import { cn } from '../../lib/utils';

// ============================================================
// BOARD CONFIGURATION
// ============================================================

const BOARD_GRID = 15; // 15x15 grid

const COLOR_HOMES: Record<LudoColor, { row: number; col: number; color: string; label: string }> = {
  red: { row: 0, col: 0, color: '#EF4444', label: 'RED' },
  blue: { row: 0, col: 9, color: '#3B82F6', label: 'BLUE' },
  green: { row: 9, col: 9, color: '#10B981', label: 'GREEN' },
  yellow: { row: 9, col: 0, color: '#EAB308', label: 'YLW' },
};

const COLOR_CONFIG: Record<LudoColor, { bg: string; border: string; text: string; hex: string }> = {
  red: { bg: 'bg-red-500', border: 'border-red-400', text: 'text-red-400', hex: '#EF4444' },
  blue: { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-400', hex: '#3B82F6' },
  green: { bg: 'bg-green-500', border: 'border-green-400', text: 'text-green-400', hex: '#10B981' },
  yellow: { bg: 'bg-yellow-400', border: 'border-yellow-300', text: 'text-yellow-400', hex: '#EAB308' },
};

// Board path (row, col coordinates for each position 0-55)
// This defines the main track positions on the 15x15 grid
const BOARD_PATH: [number, number][] = [
  // Starting from red home entry, going clockwise
  // Bottom of left column going up
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  // Left column going up
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  // Top row going right
  [0, 7], [0, 8],
  // Right of top going down
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  // Top right area
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // Right column going down
  [7, 14], [8, 14],
  // Going left on bottom right
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  // Going down left area
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // Bottom row going left
  [14, 7], [14, 6],
  // Going up on left
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  // Bottom left area going left
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  // Left column going up
  [7, 0], [7, 1],
];

// Home column paths (safe zones leading to center)
const HOME_COLUMNS: Record<LudoColor, [number, number][]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  blue: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  green: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

// Home base piece positions (4 pieces per player)
const HOME_POSITIONS: Record<LudoColor, [number, number][]> = {
  red: [[1, 1], [1, 3], [3, 1], [3, 3]],
  blue: [[1, 11], [1, 13], [3, 11], [3, 13]],
  green: [[11, 11], [11, 13], [13, 11], [13, 13]],
  yellow: [[11, 1], [11, 3], [13, 1], [13, 3]],
};

// ============================================================
// BOARD CELL COMPONENT
// ============================================================
interface CellProps {
  row: number;
  col: number;
  pathIndex: number | null;
  homeColor: LudoColor | null;
  isHomeColumn: boolean;
  homeColumnColor: LudoColor | null;
  isSafe: boolean;
  isCenter: boolean;
  pieces: { piece: LudoPiece; color: LudoColor }[];
  movablePieces: string[];
  onPieceClick: (pieceId: string) => void;
}

const BoardCell: React.FC<CellProps> = ({
  row, col, pathIndex, homeColor, isHomeColumn,
  homeColumnColor, isSafe, isCenter,
  pieces, movablePieces, onPieceClick,
}) => {
  // Determine cell background
  let cellBg = 'bg-white';
  let cellBorder = 'border-gray-200';

  if (isCenter) {
    cellBg = 'bg-gradient-to-br from-gray-100 to-gray-200';
  } else if (homeColor) {
    const config = COLOR_CONFIG[homeColor];
    cellBg = `${config.bg}/20`;
    cellBorder = config.border;
  } else if (isHomeColumn && homeColumnColor) {
    const config = COLOR_CONFIG[homeColumnColor];
    cellBg = `${config.bg}/30`;
  } else if (isSafe) {
    cellBg = 'bg-emerald-100';
  }

  return (
    <div
      className={cn(
        "relative border flex items-center justify-center overflow-hidden",
        cellBg, cellBorder,
        isCenter ? 'rounded-lg' : '',
      )}
    >
      {/* Safe star */}
      {isSafe && !homeColor && (
        <span className="absolute text-emerald-400 text-xs opacity-60">⭐</span>
      )}

      {/* Pieces */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {pieces.map((p, i) => (
            <div
              key={p.piece.id}
              className="absolute"
              style={{
                transform: `translate(${(i % 2) * 8 - 4}px, ${Math.floor(i / 2) * 8 - 4}px)`,
                zIndex: i + 1,
              }}
            >
              <LudoPieceComponent
                piece={p.piece}
                color={p.color}
                isMovable={movablePieces.includes(p.piece.id)}
                onClick={() => onPieceClick(p.piece.id)}
                size="xs"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN BOARD COMPONENT
// ============================================================
interface LudoBoardProps {
  room: LudoRoom;
  currentUserId: string;
  movablePieces: string[];
  onPieceClick: (pieceId: string) => void;
}

const LudoBoard: React.FC<LudoBoardProps> = ({
  room, currentUserId, movablePieces, onPieceClick,
}) => {
  // Build piece position map
  const pieceMap = useMemo(() => {
    const map: Map<string, { piece: LudoPiece; color: LudoColor }[]> = new Map();

    for (const player of room.players) {
      for (const piece of player.pieces) {
        if (piece.status === 'finished') continue;

        let cellKey: string;

        if (piece.position === -1) {
          // Home base - find home position
          const homePos = HOME_POSITIONS[player.color][piece.pieceIndex];
          cellKey = `${homePos[0]},${homePos[1]}`;
        } else if (piece.position > 50) {
          // Home column
          const homeColPos = HOME_COLUMNS[player.color][piece.position - 51];
          if (homeColPos) {
            cellKey = `${homeColPos[0]},${homeColPos[1]}`;
          } else continue;
        } else {
          // Main track
          const absPos = getAbsolutePosition(player.color, piece.position);
          const boardPos = BOARD_PATH[absPos];
          if (boardPos) {
            cellKey = `${boardPos[0]},${boardPos[1]}`;
          } else continue;
        }

        const existing = map.get(cellKey) || [];
        map.set(cellKey, [...existing, { piece, color: player.color }]);
      }
    }

    return map;
  }, [room.players]);

  const getCellData = (row: number, col: number) => {
    // Check if path cell
    const pathIndex = BOARD_PATH.findIndex(([r, c]) => r === row && c === col);

    // Check home zone
    let homeColor: LudoColor | null = null;
    if (row >= 0 && row <= 5 && col >= 0 && col <= 5) homeColor = 'red';
    else if (row >= 0 && row <= 5 && col >= 9 && col <= 14) homeColor = 'blue';
    else if (row >= 9 && row <= 14 && col >= 9 && col <= 14) homeColor = 'green';
    else if (row >= 9 && row <= 14 && col >= 0 && col <= 5) homeColor = 'yellow';

    // Home columns
    let homeColumnColor: LudoColor | null = null;
    const isHomeColumn = Object.entries(HOME_COLUMNS).some(([color, positions]) => {
      const found = positions.some(([r, c]) => r === row && c === col);
      if (found) homeColumnColor = color as LudoColor;
      return found;
    });

    const isCenter = row >= 6 && row <= 8 && col >= 6 && col <= 8;
    const isSafe = pathIndex !== -1 && SAFE_SQUARES.includes(pathIndex);

    const pieces = pieceMap.get(`${row},${col}`) || [];

    return { pathIndex, homeColor, isHomeColumn, homeColumnColor, isSafe, isCenter, pieces };
  };

  const playerColors = room.players.reduce<Record<string, LudoColor>>(
    (acc, p) => ({ ...acc, [p.uid]: p.color }),
    {}
  );

  return (
    <div className="relative w-full max-w-[360px] mx-auto aspect-square">
      {/* Outer border */}
      <div className="absolute inset-0 rounded-2xl border-2 border-yellow-600/40 bg-gradient-to-br from-yellow-900/20 to-gray-900/20 shadow-2xl" />

      {/* Grid */}
      <div
        className="absolute inset-1 grid"
        style={{
          gridTemplateColumns: `repeat(${BOARD_GRID}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_GRID}, 1fr)`,
          gap: '1px',
          background: '#1f2937',
          borderRadius: '12px',
        }}
      >
        {Array.from({ length: BOARD_GRID * BOARD_GRID }, (_, idx) => {
          const row = Math.floor(idx / BOARD_GRID);
          const col = idx % BOARD_GRID;
          const {
            pathIndex, homeColor, isHomeColumn,
            homeColumnColor, isSafe, isCenter, pieces,
          } = getCellData(row, col);

          // Skip rendering non-path, non-home cells inside color zones
          const isColorZone =
            (row <= 5 && col <= 5) ||
            (row <= 5 && col >= 9) ||
            (row >= 9 && col >= 9) ||
            (row >= 9 && col <= 5);

          if (isColorZone && pathIndex === -1 && !isHomeColumn) {
            // Render color zone cell
            const zoneColor =
              row <= 5 && col <= 5 ? 'red' :
              row <= 5 && col >= 9 ? 'blue' :
              row >= 9 && col >= 9 ? 'green' : 'yellow';

            // Check if it's a piece home position
            const homePos = HOME_POSITIONS[zoneColor];
            const isPieceSlot = homePos.some(([r, c]) => r === row && c === col);

            return (
              <div
                key={idx}
                className={cn(
                  "relative flex items-center justify-center rounded-sm",
                  isPieceSlot ? `bg-white/20 border border-white/10` : `opacity-100`,
                )}
                style={
                  !isPieceSlot
                    ? { background: `${COLOR_CONFIG[zoneColor].hex}30` }
                    : {}
                }
              >
                {pieces.map((p, i) => (
                  <LudoPieceComponent
                    key={p.piece.id}
                    piece={p.piece}
                    color={p.color}
                    isMovable={movablePieces.includes(p.piece.id)}
                    onClick={() => onPieceClick(p.piece.id)}
                    size="xs"
                  />
                ))}
              </div>
            );
          }

          return (
            <BoardCell
              key={idx}
              row={row}
              col={col}
              pathIndex={pathIndex}
              homeColor={homeColor}
              isHomeColumn={isHomeColumn}
              homeColumnColor={homeColumnColor}
              isSafe={isSafe}
              isCenter={isCenter}
              pieces={pieces}
              movablePieces={movablePieces}
              onPieceClick={onPieceClick}
            />
          );
        })}
      </div>

      {/* Home zone labels */}
      {Object.entries(COLOR_HOMES).map(([color, { row, col, hex, label }]) => (
        <div
          key={color}
          className="absolute flex items-center justify-center font-black text-xs"
          style={{
            color: hex,
            top: row === 0 ? '5%' : '70%',
            left: col === 0 ? '5%' : '70%',
            width: '25%',
            height: '10%',
            textShadow: `0 0 8px ${hex}80`,
          }}
        >
          {label}
        </div>
      ))}

      {/* Center arrow/home indicator */}
      <div
        className="absolute flex items-center justify-center text-2xl font-black"
        style={{
          top: '40%',
          left: '40%',
          width: '20%',
          height: '20%',
          background: 'linear-gradient(135deg, #EF4444 25%, #3B82F6 25% 50%, #10B981 50% 75%, #EAB308 75%)',
          borderRadius: '4px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}
      >
        <span className="drop-shadow-lg">🏠</span>
      </div>
    </div>
  );
};

export default LudoBoard;
