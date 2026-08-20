import React from "react";

export function HeroTitle({ lines }: { lines: string[] }) {
  return <h1 data-testid="hero-title" className="font-display max-w-3xl text-6xl leading-[0.86] tracking-[-0.045em] sm:text-8xl lg:text-[9.5rem]">{lines.map((line) => <span key={line} className="block">{line}</span>)}</h1>;
}

export function PriceLabel({ cents, prefix = "Starting from" }: { cents: number; prefix?: string }) {
  return <span data-testid="price-label" className="font-display text-3xl">{prefix} ${(cents / 100).toLocaleString()}</span>;
}

export function SeriesFilter({ series, selectedId, onSelect }: { series: Array<{ id: number; name: string }>; selectedId?: number; onSelect: (id?: number) => void }) {
  return <div data-testid="series-filter" className="flex items-center gap-3 overflow-x-auto"> <button type="button" onClick={() => onSelect(undefined)} aria-pressed={selectedId === undefined} className={`shrink-0 rounded-full border px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${selectedId === undefined ? "border-[#25221d] bg-[#25221d] text-[#f8f4ec]" : "border-[#cdbda9] text-[#6f6255]"}`}>All pieces</button>{series.map((item) => <button type="button" key={item.id} onClick={() => onSelect(item.id)} aria-pressed={selectedId === item.id} className={`shrink-0 rounded-full border px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${selectedId === item.id ? "border-[#25221d] bg-[#25221d] text-[#f8f4ec]" : "border-[#cdbda9] text-[#6f6255]"}`}>{item.name}</button>)}</div>;
}

export function ConfiguratorProgress({ step, labels }: { step: number; labels: string[] }) {
  return <div data-testid="configurator-progress" className="flex items-center justify-between border-b border-[#decfbd] pb-5">{labels.map((label, index) => <button type="button" key={label} onClick={() => undefined} aria-current={step === index + 1 ? "step" : undefined} className="flex items-center gap-3 text-left"><span className={`grid h-8 w-8 place-items-center rounded-full border text-[10px] font-bold ${step === index + 1 ? "border-[#25221d] bg-[#25221d] text-[#f8f4ec]" : "border-[#decfbd] text-[#766b5d]"}`}>0{index + 1}</span><span className="hidden text-[10px] font-bold uppercase tracking-[0.17em] sm:block">{label}</span></button>)}</div>;
}
