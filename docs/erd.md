# ERD - Pub Hopper Blaak

Dit ERD beschrijft een toekomstige database-structuur voor de Pub Hopper Blaak app. De huidige MVP gebruikt nog mock
data en AsyncStorage, maar deze structuur is geschikt voor een backend met accounts, matchmaking, themaroutes,
partnerships, timers, foto-opslag en een collage/recap na afloop.

```mermaid
erDiagram
    USER {
        string id PK
        string first_name
        string email
        string school
        string campus
        datetime created_at
    }

    PLAYER_GROUP {
        string id PK
        string group_name
        int group_size
        string selected_time_slot
        string match_status
        datetime created_at
    }

    GROUP_MEMBER {
        string id PK
        string group_id FK
        string user_id FK
        string role
        datetime joined_at
    }

    INTEREST {
        string id PK
        string name
    }

    GROUP_INTEREST {
        string group_id FK
        string interest_id FK
    }

    MATCH {
        string id PK
        string group_a_id FK
        string group_b_id FK
        int match_score
        string status
        datetime matched_at
    }

    GAME_SESSION {
        string id PK
        string match_id FK
        string route_id FK
        string theme_id FK
        string selected_time_slot
        string status
        int current_stop_index
        datetime started_at
        datetime completed_at
    }

    ROUTE_THEME {
        string id PK
        string name
        string description
        string mood
        bool active
    }

    ROUTE {
        string id PK
        string theme_id FK
        string name
        string area
        string city
        string route_type
        bool active
    }

    VENUE {
        string id PK
        string name
        string venue_type
        string address
        string description
        decimal latitude
        decimal longitude
        string suggested_order
        string vibe
    }

    PARTNER {
        string id PK
        string organization_name
        string contact_email
        string partnership_type
        string status
        datetime created_at
    }

    VENUE_PARTNERSHIP {
        string id PK
        string venue_id FK
        string partner_id FK
        string deal_title
        string deal_description
        datetime starts_at
        datetime ends_at
        bool active
    }

    ROUTE_STOP {
        string id PK
        string route_id FK
        string venue_id FK
        int route_order
        int planned_duration_minutes
        string walk_label
    }

    SESSION_STOP {
        string id PK
        string session_id FK
        string route_stop_id FK
        string timer_state
        datetime arrived_at
        datetime timer_started_at
        datetime timer_finished_at
        datetime completed_at
    }

    CONVERSATION_STARTER {
        string id PK
        string venue_id FK
        string theme_id FK
        string category
        string prompt
        int trigger_minute
    }

    PHOTO {
        string id PK
        string session_stop_id FK
        string uploaded_by_group_id FK
        string photo_url
        string local_uri
        string proof_type
        datetime created_at
    }

    COLLAGE {
        string id PK
        string session_id FK
        string title
        string collage_url
        string layout_type
        string share_token
        datetime created_at
    }

    COLLAGE_PHOTO {
        string id PK
        string collage_id FK
        string photo_id FK
        int display_order
        string caption
    }

    USER ||--o{ GROUP_MEMBER: joins
    PLAYER_GROUP ||--o{ GROUP_MEMBER: contains
    PLAYER_GROUP ||--o{ GROUP_INTEREST: selects
    INTEREST ||--o{ GROUP_INTEREST: categorizes
    PLAYER_GROUP ||--o{ MATCH: group_a
    PLAYER_GROUP ||--o{ MATCH: group_b
    MATCH ||--o| GAME_SESSION: creates
    ROUTE_THEME ||--o{ ROUTE: defines
    ROUTE_THEME ||--o{ GAME_SESSION: selected_for
    ROUTE ||--o{ ROUTE_STOP: contains
    VENUE ||--o{ ROUTE_STOP: appears_on
    PARTNER ||--o{ VENUE_PARTNERSHIP: funds
    VENUE ||--o{ VENUE_PARTNERSHIP: offers
    ROUTE ||--o{ GAME_SESSION: used_by
    GAME_SESSION ||--o{ SESSION_STOP: tracks
    ROUTE_STOP ||--o{ SESSION_STOP: instantiates
    VENUE ||--o{ CONVERSATION_STARTER: has
    ROUTE_THEME ||--o{ CONVERSATION_STARTER: influences
    SESSION_STOP ||--o{ PHOTO: requires
    PLAYER_GROUP ||--o{ PHOTO: uploads
    GAME_SESSION ||--o| COLLAGE: generates
    COLLAGE ||--o{ COLLAGE_PHOTO: contains
    PHOTO ||--o{ COLLAGE_PHOTO: used_in
```

## Belangrijkste Entiteiten

### User

Een student die de app gebruikt. In de MVP is er nog geen login, maar bij een echte backend is dit nodig voor accounts,
groepsleden en foto-eigenaarschap.

### PlayerGroup

De groep waarmee studenten meedoen. Een groep heeft 4 tot 8 personen, een gekozen tijdslot, interesses en een
matchstatus.

### GroupMember

Koppelt gebruikers aan een groep. Hierdoor kan een groep meerdere studenten bevatten.

### Interest en GroupInterest

Interesses worden los opgeslagen zodat matchmaking flexibel blijft. Een groep kan meerdere interesses kiezen.

### Match

Legt vast welke twee groepen aan elkaar gekoppeld zijn, inclusief matchscore en status.

### GameSession

De daadwerkelijke pub hopper game. Deze start na een match en houdt bij welke route en welk thema wordt gespeeld, wat de
status is en bij welke stop de spelers zijn.

### RouteTheme

Een thema dat studenten kunnen kiezen voordat de route start. Hierdoor hoeft de app niet alleen pubroutes aan te bieden.

Voorbeelden:

- Pub
- Cafe route
- Culture walk
- Park walk

Het gekozen thema kan bepalen welke venues worden getoond, welke conversation starters verschijnen en welke sfeer de
route heeft.

### Route, Venue en RouteStop

De route bestaat uit 5 stops. In plaats van alleen `PUB` gebruikt het model nu `VENUE`, zodat een route ook cafes,
koffiezaken, lunchplekken, culturele plekken of alcoholvrije locaties kan bevatten.

`RouteStop` bepaalt de volgorde, looptijd en geplande duur per venue. Hierdoor kan dezelfde venue later in meerdere
routes of thema's voorkomen.

### Partner en VenuePartnership

Deze tabellen ondersteunen partnerships met pubs, cafes of andere locaties. Een partner kan bijvoorbeeld betalen voor
zichtbaarheid, een student deal aanbieden of een gesponsorde challenge toevoegen.

Voorbeelden:

- student discount;
- first drink deal;
- mocktail deal;
- coffee deal;
- sponsored photo challenge;
- featured venue placement;
- intro-week partnership.

### SessionStop

De voortgang van een specifieke sessie bij een route stop. Hier worden timerstatus, aankomsttijd en voltooiing
bijgehouden.

### ConversationStarter

Vragen of opdrachten per venue en eventueel per thema. `trigger_minute` bepaalt wanneer de prompt verschijnt,
bijvoorbeeld minuut 0, 5, 10 of 15.

Daardoor kan dezelfde locatie andere prompts krijgen bij verschillende thema's. Een cafe-route kan bijvoorbeeld
rustigere vragen hebben dan een nightlife-route.

### Photo

Foto die na een stop wordt toegevoegd als bewijs of herinnering. In de MVP is dit een lokale URI; in een backend wordt
dit waarschijnlijk een `photo_url`.

### Collage en CollagePhoto

Na de laatste stop kan de app automatisch een collage of recap genereren. `COLLAGE` hoort bij een game session.
`COLLAGE_PHOTO` bepaalt welke foto's in de collage staan, in welke volgorde, en met welk onderschrift.

Dit ondersteunt de feature waarbij studenten na afloop hun route kunnen terugzien als herinnering.

## Relaties Kort Uitgelegd

- Een groep heeft meerdere groepsleden.
- Een groep kiest meerdere interesses.
- Een match koppelt twee groepen.
- Een match kan een game session starten.
- Een game session gebruikt een route en een gekozen thema.
- Een thema kan meerdere routes beinvloeden.
- Een route bestaat uit meerdere route stops.
- Een route stop verwijst naar een venue.
- Een venue kan een pub, cafe, koffiezaak of andere sociale plek zijn.
- Een venue kan meerdere partnerships of deals hebben.
- Een game session heeft meerdere session stops.
- Een session stop vereist minimaal een foto.
- Een venue kan meerdere conversation starters hebben.
- Een game session kan een collage genereren.
- Een collage bevat meerdere foto's.

## MVP vs Backend

In de huidige MVP worden deze gegevens nog niet in een database opgeslagen. De app gebruikt:

- mock venues;
- mock themes;
- mock groups;
- lokale session state;
- AsyncStorage;
- lokale foto-URI's.

Voor een echte backend zouden vooral deze tabellen als eerste nodig zijn:

1. `PLAYER_GROUP`
2. `INTEREST`
3. `GROUP_INTEREST`
4. `MATCH`
5. `GAME_SESSION`
6. `ROUTE_THEME`
7. `ROUTE`
8. `VENUE`
9. `ROUTE_STOP`
10. `SESSION_STOP`
11. `PHOTO`
12. `COLLAGE`

Voor partnerships zijn daarna nodig:

1. `PARTNER`
2. `VENUE_PARTNERSHIP`

Voor een uitgebreidere collage-feature is daarnaast nodig:

1. `COLLAGE_PHOTO`

`USER` kan later worden toegevoegd als de app login of persoonlijke profielen krijgt.
