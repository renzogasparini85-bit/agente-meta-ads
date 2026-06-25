def should_notify_client(client, local_hour: int) -> bool:
    return int(getattr(client, "notif_hora", 9) or 9) == local_hour
