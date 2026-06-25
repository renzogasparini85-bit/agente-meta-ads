def metrics_for_meta_entity(ads, meta_id: str, extract_conversions):
    matched = [
        ad
        for ad in ads
        if ad.get("ad_id") == meta_id
        or ad.get("adset_id") == meta_id
        or ad.get("campaign_id") == meta_id
    ]
    if not matched:
        return None

    spend = sum(float(ad.get("spend") or 0) for ad in matched)
    conversions = sum(extract_conversions(ad.get("actions", [])) for ad in matched)
    impressions = sum(float(ad.get("impressions") or 0) for ad in matched)
    clicks = sum(float(ad.get("clicks") or 0) for ad in matched)
    frequency = sum(float(ad.get("frequency") or 0) for ad in matched) / len(matched)

    return {
        "spend": round(spend, 2),
        "conv": conversions,
        "cpa": round(spend / conversions, 2) if conversions > 0 else None,
        "ctr": round(clicks / impressions * 100, 2) if impressions > 0 else None,
        "freq": round(frequency, 2),
    }
