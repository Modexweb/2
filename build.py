#!/usr/bin/env python3
"""Build Modex as a static, GitHub Pages-friendly website from games.json."""
from __future__ import annotations
import html
import json
import os
import re
import shutil
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "game"


def esc(value) -> str:
    return html.escape(str(value if value is not None else ""), quote=True)


def plain(value) -> str:
    return re.sub(r"<[^>]*>", "", str(value or "")).strip()


def rel_asset(path: str, prefix: str = "../../") -> str:
    if re.match(r"^https?://", str(path or ""), re.I):
        return esc(path)
    return prefix + quote(str(path or "").lstrip("./"), safe="/")


def url_for(site_url: str, path: str) -> str:
    return site_url.rstrip("/") + "/" + path.lstrip("/") if site_url else ""


def header(prefix: str) -> str:
    return f'''<header class="site-header">
<a class="brand" href="{prefix}" aria-label="Modex home"><span class="brand-mark">M</span><span>mode<span class="brand-accent">x</span></span></a>
<nav class="header-nav" aria-label="Main navigation"><a class="nav-link" href="{prefix}#games">Discover</a><a class="nav-link" href="{prefix}#games">Games</a><a class="nav-link" href="{prefix}admin.html">Manage games</a></nav>
<div class="header-tools"><form class="search-box" id="searchForm" role="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input id="searchInput" name="q" type="search" placeholder="Search games..." aria-label="Search games"><kbd>↵</kbd></form><button class="icon-button" id="themeToggle" type="button" aria-label="Switch color theme" title="Switch theme"><span id="themeGlyph">☼</span></button></div>
</header>'''


def game_card(game, slug: str, image_prefix: str = "../../", link_prefix: str = "../") -> str:
    img = rel_asset(game.get("image", ""), image_prefix)
    title = esc(game.get("title", "Untitled game"))
    category = esc(game.get("category", "Other"))
    rating = esc(game.get("rating", "—"))
    size = esc(game.get("size", "—"))
    return f'''<article class="game-card"><a class="game-card-link" href="{link_prefix}{esc(slug)}/"><img class="game-card-image" src="{img}" alt="{title} cover art" loading="lazy"><div class="game-card-body"><span class="game-category">{category}</span><h3>{title}</h3><div class="game-card-meta"><span>{size}</span><span class="rating"><span class="rating-star">★</span>{rating}</span></div></div></a></article>'''


def detail_page(game: dict, slug: str, games: list[dict], slug_by_id: dict, site_url: str) -> str:
    prefix = "../../"
    title = esc(game.get("title", "Untitled game"))
    category = esc(game.get("category", "Other"))
    description = game.get("description") or {}
    overview = plain(description.get("overview") or f"Explore {game.get('title', 'this game')} and discover its gameplay, key features and available details.")
    genre = plain(description.get("genre") or game.get("category") or "Mobile game")
    platform = plain(description.get("platform") or "Android")
    mod_features = plain(description.get("modFeatures") or "See the game description for available features.")
    rating = esc(game.get("rating", "Not listed"))
    size = esc(game.get("size", "Not listed"))
    image = rel_asset(game.get("image", ""), prefix)
    canonical = url_for(site_url, f"games/{slug}/")
    features = description.get("keyFeatures") or []
    features_html = "".join(f"<li>{esc(plain(feature))}</li>" for feature in features)
    why = description.get("whyChooseMod") or []
    why_html = "".join(f"<li>{esc(plain(reason))}</li>" for reason in why)
    screenshots = game.get("screenshots") or []
    screenshot_html = ""
    if screenshots:
        screenshot_cards = []
        for index, src in enumerate(screenshots, 1):
            screenshot_cards.append(f'<figure class="screenshot-card"><img src="{rel_asset(src, prefix)}" loading="lazy" alt="{title} screenshot {index}"></figure>')
        screenshot_html = f'<section class="section-block"><div class="section-heading"><div><p class="section-overline">TAKE A CLOSER LOOK</p><h2>Screenshots</h2></div></div><div class="screenshot-gallery">{"".join(screenshot_cards)}</div></section>'
    download_url = str(game.get("downloadUrl") or "").strip()
    if download_url and re.match(r"^https?://", download_url, re.I):
        download_html = f'<a class="button" href="{esc(download_url)}" target="_blank" rel="sponsored nofollow noopener noreferrer">Continue to download <span aria-hidden="true">↗</span></a>'
        download_note = 'You will continue to the download destination in a new tab. Review the source and requested permissions before installing any APK.'
    else:
        download_html = '<span class="button button-disabled" aria-disabled="true">Download link not available</span>'
        download_note = 'A download destination has not been configured for this game yet.'
    related = [item for item in games if item.get("title") != game.get("title") and item.get("category") == game.get("category")][:4]
    if len(related) < 4:
        extras = [item for item in games if item.get("title") != game.get("title") and item not in related]
        related.extend(extras[:4-len(related)])
    related_cards = "".join(game_card(item, slug_by_id[id(item)], image_prefix=prefix, link_prefix="../") for item in related)
    jsonld = {
        "@context": "https://schema.org", "@type": "VideoGame", "name": str(game.get("title", "")),
        "genre": genre, "operatingSystem": platform, "description": overview,
        "image": url_for(site_url, "images/" + quote(Path(str(game.get("image", ""))).name)),
        "aggregateRating": None,
    }
    jsonld = {k:v for k,v in jsonld.items() if v is not None and v != ""}
    structured = json.dumps(jsonld, ensure_ascii=False).replace("<", "\\u003c")
    meta_desc = esc((overview[:155].rsplit(" ", 1)[0] if len(overview) > 155 else overview))
    canonical_tag = f'<link rel="canonical" href="{esc(canonical)}">' if canonical else ""
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#10131a"><meta name="description" content="{meta_desc}"><title>{title} — Modex Game Guide</title>{canonical_tag}<meta property="og:type" content="article"><meta property="og:title" content="{title} — Modex"><meta property="og:description" content="{meta_desc}"><meta property="og:image" content="{esc(url_for(site_url, 'images/' + quote(Path(str(game.get('image',''))).name)))}"><link rel="icon" href="{image}" type="image/png"><link rel="stylesheet" href="../../style.css"><script type="application/ld+json">{structured}</script><script src="../../app.js" defer></script></head>
<body data-page="game" data-base="../../">{header(prefix)}
<main class="game-detail-wrap"><div class="breadcrumb"><a href="../../">Discover</a><span>／</span><a href="../../#games">Games</a><span>／</span><span>{title}</span></div>
<section class="detail-hero"><div class="detail-copy"><p class="eyebrow"><span class="eyebrow-dot"></span> MODEX GAME GUIDE</p><p class="detail-category">{category} / {esc(platform)}</p><h1 class="detail-title">{title}</h1><p class="detail-intro">{esc(overview)}</p><div class="detail-pills"><span class="detail-pill">★ {rating} rating</span><span class="detail-pill">{size}</span><span class="detail-pill">{esc(genre)}</span></div><div class="detail-actions"><a class="button button-light" href="#game-details">Explore details <span aria-hidden="true">↓</span></a></div></div><div class="detail-image-frame"><img class="detail-image" src="{image}" alt="{title} cover art" fetchpriority="high"></div></section>
{screenshot_html}
<div class="detail-content-grid" id="game-details"><article class="detail-main-column"><p class="section-overline">ABOUT THE GAME</p><h2>What to expect</h2><p>{esc(overview)}</p><h2>Version highlights</h2><p>{esc(mod_features)}</p><h2>Key features</h2><ul class="feature-list">{features_html or '<li>More game features will be added soon.</li>'}</ul>{f'<h2>Additional highlights</h2><ul class="feature-list">{why_html}</ul>' if why_html else ''}</article>
<aside class="detail-side-column"><div class="download-panel"><p class="section-overline">READY TO PLAY?</p><h2>Get the game</h2><p>Check the destination and app permissions before downloading or installing.</p>{download_html}</div><section class="detail-side-card"><h2>Game details</h2><dl class="detail-facts"><div class="detail-fact"><dt>Category</dt><dd>{category}</dd></div><div class="detail-fact"><dt>Genre</dt><dd>{esc(genre)}</dd></div><div class="detail-fact"><dt>Platform</dt><dd>{esc(platform)}</dd></div><div class="detail-fact"><dt>Listed size</dt><dd>{size}</dd></div><div class="detail-fact"><dt>Listed rating</dt><dd>★ {rating}</dd></div></dl><p class="small-note">Ratings, sizes and feature descriptions are supplied by the site catalogue and may change over time.</p></section></aside></div>
<section class="related-section"><div class="section-heading"><div><p class="section-overline">KEEP EXPLORING</p><h2>Similar games</h2></div><a class="nav-link" href="../../#games">View all games ↗</a></div><div class="related-grid">{related_cards}</div></section></main>
<footer class="site-footer"><a class="brand footer-brand" href="../../"><span class="brand-mark">M</span><span>mode<span class="brand-accent">x</span></span></a><p>Discover games. Find your next level.</p><div class="footer-links"><a href="../../#games">Games</a><a href="../../admin.html">Manage games</a></div><span class="copyright">© {__import__('datetime').datetime.now().year} Modex</span></footer></body></html>'''


def main() -> None:
    games_file = ROOT / "games.json"
    games = json.loads(games_file.read_text(encoding="utf-8"))
    if not isinstance(games, list):
        raise SystemExit("games.json must contain a JSON array.")
    seen_slugs: set[str] = set()
    slug_by_id: dict[int, str] = {}
    for game in games:
        if not isinstance(game, dict) or not game.get("title"):
            raise SystemExit("Every entry in games.json must be an object with a title.")
        base_slug = slugify(str(game.get("slug") or game["title"]))
        slug, suffix = base_slug, 2
        while slug in seen_slugs:
            slug = f"{base_slug}-{suffix}"; suffix += 1
        seen_slugs.add(slug)
        game["slug"] = slug
        slug_by_id[id(game)] = slug
    # Normalise the source file with generated slugs so cards and page paths use one stable key.
    games_file.write_text(json.dumps(games, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    site_url = os.environ.get("SITE_URL", "").strip().rstrip("/")
    repo = os.environ.get("GITHUB_REPOSITORY", "").strip()
    if not site_url and "/" in repo:
        owner, name = repo.split("/", 1)
        site_url = f"https://{owner}.github.io" + ("" if name.lower() == f"{owner}.github.io".lower() else f"/{name}")

    if DIST.exists(): shutil.rmtree(DIST)
    DIST.mkdir(parents=True)
    for filename in ("index.html", "style.css", "app.js", "games.json", "admin.html", "admin.js"):
        source = ROOT / filename
        if source.exists(): shutil.copy2(source, DIST / filename)
    shutil.copytree(ROOT / "images", DIST / "images", ignore=shutil.ignore_patterns("test.txt"))
    if (ROOT / ".nojekyll").exists(): shutil.copy2(ROOT / ".nojekyll", DIST / ".nojekyll")
    # Add canonical/Open Graph homepage metadata only when the publishing URL is known.
    if site_url:
        root_html = (DIST / "index.html").read_text(encoding="utf-8")
        homepage_meta = f'<link rel="canonical" href="{esc(url_for(site_url, ""))}"><meta property="og:url" content="{esc(url_for(site_url, ""))}">'
        root_html = root_html.replace("</head>", homepage_meta + "</head>", 1)
        (DIST / "index.html").write_text(root_html, encoding="utf-8")
    # Correctly named robots.txt; the original project used robots..txt by mistake.
    sitemap_line = f"Sitemap: {site_url}/sitemap.xml\n" if site_url else ""
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\n{sitemap_line}", encoding="utf-8")

    for game in games:
        slug = slug_by_id[id(game)]
        page_dir = DIST / "games" / slug
        page_dir.mkdir(parents=True, exist_ok=True)
        page_dir.joinpath("index.html").write_text(detail_page(game, slug, games, slug_by_id, site_url), encoding="utf-8")

    if site_url:
        urls = [url_for(site_url, "")] + [url_for(site_url, f"games/{slug}/") for slug in seen_slugs]
        body = "\n".join(f"  <url><loc>{esc(url)}</loc></url>" for url in urls)
        (DIST / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}\n</urlset>\n', encoding="utf-8")
    print(f"Built {len(games)} game pages into {DIST}")
    if not site_url:
        print("SITE_URL/GITHUB_REPOSITORY is not set; canonical tags and sitemap were omitted. Set SITE_URL when publishing on a custom domain.")

if __name__ == "__main__":
    main()
