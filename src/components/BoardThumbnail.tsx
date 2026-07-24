import type { CSSProperties } from "react";
import type { EvidenceCard, PublicBoardPreview } from "../DetectiveBoard";

const PREVIEW_RATIO = 1240 / 760;
const MIN_PREVIEW_WIDTH = 700;
const MIN_PREVIEW_HEIGHT = MIN_PREVIEW_WIDTH / PREVIEW_RATIO;
const PREVIEW_PADDING = 90;
const MAX_PREVIEW_CARDS = 40;
const MAX_PREVIEW_LINKS = 60;

type PreviewBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function previewBounds(cards: EvidenceCard[]): PreviewBounds {
  if (cards.length === 0) {
    return { x: 0, y: 0, width: 1240, height: 760 };
  }

  const minX = Math.min(...cards.map((card) => card.x)) - PREVIEW_PADDING;
  const minY = Math.min(...cards.map((card) => card.y)) - PREVIEW_PADDING;
  const maxX = Math.max(...cards.map((card) => card.x + card.w)) + PREVIEW_PADDING;
  const maxY = Math.max(...cards.map((card) => card.y + card.h)) + PREVIEW_PADDING;
  let width = Math.max(MIN_PREVIEW_WIDTH, maxX - minX);
  let height = Math.max(MIN_PREVIEW_HEIGHT, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  if (width / height > PREVIEW_RATIO) {
    height = width / PREVIEW_RATIO;
  } else {
    width = height * PREVIEW_RATIO;
  }

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

function cardPosition(card: EvidenceCard, bounds: PreviewBounds): CSSProperties {
  return {
    left: `${((card.x - bounds.x) / bounds.width) * 100}%`,
    top: `${((card.y - bounds.y) / bounds.height) * 100}%`,
    width: `${Math.max(5.5, (card.w / bounds.width) * 100)}%`,
    height: `${Math.max(8, (card.h / bounds.height) * 100)}%`,
    transform: `rotate(${card.rotation * 0.55}deg)`,
  };
}

export function BoardThumbnail({
  preview,
  title,
}: {
  preview: PublicBoardPreview;
  title: string;
}) {
  const cards = Array.isArray(preview.cards) ? preview.cards : [];
  const links = Array.isArray(preview.links) ? preview.links : [];
  const visibleCards = cards.slice(0, MAX_PREVIEW_CARDS);
  const visibleCardIds = new Set(visibleCards.map((card) => card.id));
  const cardMap = new Map(visibleCards.map((card) => [card.id, card]));
  const bounds = previewBounds(cards);
  const percentPoint = (card: EvidenceCard) => ({
    x: ((card.x + card.w / 2 - bounds.x) / bounds.width) * 100,
    y: ((card.y + card.h / 2 - bounds.y) / bounds.height) * 100,
  });

  return (
    <span
      className={`community-board-thumb community-board-miniature ${cards.length === 0 ? "is-empty" : ""}`}
      role="img"
      aria-label={`${title} 的完整线索板缩略图：${cards.length} 条线索，${links.length} 条关联`}
    >
      <svg className="community-board-mini-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {links.slice(0, MAX_PREVIEW_LINKS).map((link) => {
          if (!visibleCardIds.has(link.from) || !visibleCardIds.has(link.to)) return null;
          const from = cardMap.get(link.from);
          const to = cardMap.get(link.to);
          if (!from || !to) return null;
          const start = percentPoint(from);
          const end = percentPoint(to);
          return <line key={link.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
        })}
      </svg>

      {visibleCards.map((card) => (
        <span
          className={`community-board-mini-card type-${card.type}`}
          style={cardPosition(card, bounds)}
          key={card.id}
          aria-hidden="true"
        >
          {card.image ? <img src={card.image} alt="" loading="lazy" draggable={false} /> : <i />}
          <b />
        </span>
      ))}

      {cards.length === 0 && <span className="community-board-mini-empty">EMPTY BOARD</span>}
      <span className="community-board-complexity">
        <b>{cards.length}</b> 线索 · <b>{links.length}</b> 关联
      </span>
    </span>
  );
}
