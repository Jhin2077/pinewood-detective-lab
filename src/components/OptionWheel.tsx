import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./OptionWheel.css";

type Side = "left" | "right";

export type OptionWheelProps = {
  items: string[];
  defaultSelected?: number;
  onChange?: (index: number, item: string) => void;
  ariaLabel?: string;
  textColor?: string;
  activeColor?: string;
  side?: Side;
  fontSize?: number;
  spacing?: number;
  curve?: number;
  tilt?: number;
  blur?: number;
  fade?: number;
  minOpacity?: number;
  smoothing?: number;
  inset?: number;
  loop?: boolean;
  draggable?: boolean;
  soundUrl?: string;
  soundVolume?: number;
  className?: string;
};

type WheelConfig = {
  count: number;
  items: string[];
  rowHeight: number;
  curve: number;
  tilt: number;
  blur: number;
  fade: number;
  minOpacity: number;
  side: Side;
  loop: boolean;
  smoothing: number;
  draggable: boolean;
  soundUrl: string;
  soundVolume: number;
};

export function OptionWheel({
  items,
  defaultSelected = 0,
  onChange,
  ariaLabel = "案件类型拨轮",
  textColor = "#a6a6a6",
  activeColor = "#ffffff",
  side = "left",
  fontSize = 3,
  spacing = 1.4,
  curve = 1,
  tilt = 6,
  blur = 2,
  fade = 0.25,
  minOpacity = 0.05,
  smoothing = 200,
  inset = 80,
  loop = false,
  draggable = true,
  soundUrl = "",
  soundVolume = 0.5,
  className = "",
}: OptionWheelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const positionRef = useRef(defaultSelected);
  const targetRef = useRef(defaultSelected);
  const animationRef = useRef<number | null>(null);
  const frameCallbackRef = useRef<(now: number) => void>(() => undefined);
  const lastFrameRef = useRef(0);
  const configRef = useRef<WheelConfig>({} as WheelConfig);
  const onChangeRef = useRef(onChange);
  const selectedRef = useRef(defaultSelected);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{ y: number; start: number; id: number } | null>(null);
  const dragMovedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef("");
  const lastTickRef = useRef(0);
  const [selectedIndex, setSelectedIndex] = useState(defaultSelected);
  const [isDragging, setIsDragging] = useState(false);

  const rootFontSize = typeof window !== "undefined"
    ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    : 16;

  const config = useMemo<WheelConfig>(() => ({
    count: items.length,
    items,
    rowHeight: Math.max(fontSize * spacing * rootFontSize, 1),
    curve,
    tilt,
    blur,
    fade,
    minOpacity,
    side,
    loop,
    smoothing,
    draggable,
    soundUrl,
    soundVolume,
  }), [blur, curve, draggable, fade, fontSize, items, loop, minOpacity, rootFontSize, side, smoothing, soundUrl, soundVolume, spacing, tilt]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const runFrame = useCallback((now: number) => {
    const deltaTime = Math.min((now - lastFrameRef.current) / 1000, 0.05);
    lastFrameRef.current = now;
    const config = configRef.current;
    const smoothingSeconds = Math.max(config.smoothing, 1) / 1000;
    const easing = 1 - Math.exp(-deltaTime / smoothingSeconds);

    const target = targetRef.current;
    let next = positionRef.current + (target - positionRef.current) * easing;
    const settled = Math.abs(target - next) < 0.001;
    if (settled) next = target;
    positionRef.current = next;

    const mirror = config.side === "right" ? -1 : 1;
    const tiltRadians = (config.tilt * Math.PI) / 180;
    const radius = tiltRadians > 0.0005 ? config.rowHeight / tiltRadians : 0;

    itemRefs.current.forEach((element, index) => {
      if (!element) return;
      let distanceFromSelection = index - next;
      if (config.loop && config.count > 1) {
        distanceFromSelection = ((distanceFromSelection % config.count) + config.count) % config.count;
        if (distanceFromSelection > config.count / 2) distanceFromSelection -= config.count;
      }

      const distance = Math.abs(distanceFromSelection);
      let x = 0;
      let y = distanceFromSelection * config.rowHeight;
      let rotation = 0;
      if (radius > 0) {
        const angle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, distanceFromSelection * tiltRadians));
        y = radius * Math.sin(angle);
        x = -mirror * radius * (1 - Math.cos(angle)) * config.curve;
        rotation = (mirror * angle * 180) / Math.PI;
      }

      element.style.transform = `translate(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%)) rotate(${rotation.toFixed(3)}deg)`;
      element.style.opacity = String(Math.max(config.minOpacity, 1 - distance * config.fade));
      element.style.filter = config.blur > 0 ? `blur(${(distance * config.blur).toFixed(2)}px)` : "none";
      element.style.setProperty("--ow-p", Math.max(0, 1 - Math.min(distance, 1)).toFixed(4));
    });

    animationRef.current = settled ? null : requestAnimationFrame(frameCallbackRef.current);
  }, []);

  useEffect(() => {
    frameCallbackRef.current = runFrame;
  }, [runFrame]);

  const startAnimation = useCallback(() => {
    if (animationRef.current !== null) return;
    lastFrameRef.current = performance.now();
    animationRef.current = requestAnimationFrame(frameCallbackRef.current);
  }, []);

  const playTick = useCallback(() => {
    const { soundUrl: currentSoundUrl, soundVolume: currentSoundVolume } = configRef.current;
    if (!currentSoundUrl) return;
    const now = performance.now();
    if (now - lastTickRef.current < 70) return;
    lastTickRef.current = now;
    if (!audioRef.current || audioUrlRef.current !== currentSoundUrl) {
      audioRef.current = new Audio(currentSoundUrl);
      audioRef.current.preload = "auto";
      audioUrlRef.current = currentSoundUrl;
    }
    const audio = audioRef.current;
    audio.volume = Math.min(Math.max(currentSoundVolume, 0), 1);
    audio.currentTime = 0;
    audio.play()?.catch(() => undefined);
  }, []);

  const applyTarget = useCallback((value: number, snap: boolean) => {
    const config = configRef.current;
    if (config.count === 0) return;
    let nextValue = value;
    if (!config.loop) nextValue = Math.min(Math.max(nextValue, 0), Math.max(config.count - 1, 0));
    if (snap) nextValue = Math.round(nextValue);
    targetRef.current = nextValue;
    const index = ((Math.round(nextValue) % config.count) + config.count) % config.count;
    if (index !== selectedRef.current) {
      selectedRef.current = index;
      setSelectedIndex(index);
      onChangeRef.current?.(index, config.items[index]);
      playTick();
    }
    startAnimation();
  }, [playTick, startAnimation]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const config = configRef.current;
      const delta = event.deltaMode === 1 ? event.deltaY * 24 : event.deltaY;
      const step = Math.max(-1, Math.min(1, delta / config.rowHeight));
      applyTarget(targetRef.current + step, false);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => applyTarget(targetRef.current, true), 140);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, [applyTarget]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!configRef.current.draggable) return;
    dragRef.current = { y: event.clientY, start: targetRef.current, id: event.pointerId };
    dragMovedRef.current = false;
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaY = event.clientY - drag.y;
    if (!dragMovedRef.current && Math.abs(deltaY) > 4) {
      dragMovedRef.current = true;
      rootRef.current?.setPointerCapture(drag.id);
    }
    if (dragMovedRef.current) applyTarget(drag.start - deltaY / configRef.current.rowHeight, false);
  }, [applyTarget]);

  const handlePointerEnd = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    if (dragMovedRef.current) applyTarget(targetRef.current, true);
  }, [applyTarget]);

  const handleItemClick = useCallback((index: number) => {
    if (dragMovedRef.current) return;
    const config = configRef.current;
    const current = targetRef.current;
    let delta = index - (((current % config.count) + config.count) % config.count);
    if (config.loop && config.count > 1) {
      if (delta > config.count / 2) delta -= config.count;
      else if (delta < -config.count / 2) delta += config.count;
    }
    applyTarget(current + delta, true);
  }, [applyTarget]);

  const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    let delta: number | null = null;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") delta = -1;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") delta = 1;
    if (delta === null) return;
    event.preventDefault();
    applyTarget(Math.round(targetRef.current) + delta, true);
  }, [applyTarget]);

  useEffect(() => {
    applyTarget(targetRef.current, false);
  }, [applyTarget, blur, curve, fade, fontSize, inset, items, loop, minOpacity, side, smoothing, spacing, tilt]);

  useEffect(() => () => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (wheelTimerRef.current) {
      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = null;
    }
    audioRef.current?.pause();
  }, []);

  return (
    <div
      ref={rootRef}
      role="listbox"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-activedescendant={`case-genre-${selectedIndex}`}
      className={`option-wheel${side === "right" ? " option-wheel--right" : ""}${isDragging ? " option-wheel--dragging" : ""}${className ? ` ${className}` : ""}`}
      style={{
        "--ow-text-color": textColor,
        "--ow-active-color": activeColor,
        "--ow-font-size": `${fontSize}rem`,
        "--ow-inset": `${inset}px`,
      } as CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
    >
      {items.map((label, index) => (
        <div
          id={`case-genre-${index}`}
          key={`${label}-${index}`}
          ref={(element) => {
            itemRefs.current[index] = element;
          }}
          role="option"
          aria-selected={selectedIndex === index}
          className={`option-wheel__item${selectedIndex === index ? " option-wheel__item--selected" : ""}`}
          onClick={() => handleItemClick(index)}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
