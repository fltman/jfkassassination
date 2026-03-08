#!/usr/bin/env python3
"""
Verify all JFK soundtrack style descriptions are exactly 300 characters.
Run: python3 data/jfk_style_check.py
"""

tracks = {
    "Track 01 - Dealey Plaza Main Theme": (
        "Cinematic orchestral noir, John Barry meets Ennio Morricone. Muted trumpet melody over slow string swells, deep cello drones. Wire brush snare, sparse piano chords. Haunting, melancholic, 52 BPM. 1960s spy thriller atmosphere. Male baritone wordless hum. Dark Americana. Texas dust and silence."
    ),
    "Track 02 - The Crime Scene": (
        "Urgent cinematic thriller orchestra. Frantic strings surge then fracture into silence. Police radio static, dissonant brass stabs, military snare rolls. Texas noir, 1963. Tempo accelerates then collapses to near-nothing. Pure shock, sudden collapse, heat. Piano notes fall like terrible questions."
    ),
    "Track 03 - Night Map": (
        "Dark ambient cinematic loop, 60 BPM. Slow pulsing synthesizer bass, distant muted trumpet, sparse reverb piano notes. Noir nocturnal mood, investigative tension. 1960s Dallas at night. No vocals. Subtle tape hiss, a clock ticking. Sparse string textures. Mysterious, meditative, endlessly unresolved."
    ),
    "Track 04 - Witness Testimony": (
        "Intimate 1960s noir jazz, slow brushed drums, upright bass, muted piano chords. Nervous, confessional atmosphere, 68 BPM. Close-mic female vocal hum. Cigarette smoke and fluorescent corridor lights. Tense but very quiet. A single saxophone phrase repeating softly. Documentary realism. Memory and dread."
    ),
    "Track 05 - Clue Discovered Stinger": (
        "Short orchestral stinger, ten seconds. Bright muted trumpet fanfare, single piano chord cluster, descending string figure. Ominous yet revelatory. 1960s noir thriller discovery motif. Puzzle piece clicking into place. Tense and precise. Sparse, cinematic. Unresolved final note left hanging in empty air."
    ),
    "Track 06 - The Grassy Knoll": (
        "Paranoid cinematic noir, 58 BPM. Layered strings in dissonant clusters, multiple melodic lines conflict and overlap simultaneously. Muted brass, prepared piano, distant choir hum. Unsettling, claustrophobic. Hidden truths beneath the surface. 1960s political thriller. Questions multiply. No resolution."
    ),
    "Track 07 - The Investigation": (
        "Cold procedural noir orchestra, 64 BPM. Typewriter rhythm percussion, institutional brass, rigid march feel. Bureaucratic dread throughout. Muted trombone and low strings. 1960s government thriller. Male baritone spoken word breaks. Methodical, suffocating, deliberate. A cover-up made audible in cold sound."
    ),
    "Track 08 - Investigation Board": (
        "Late-night noir jazz-ambient hybrid, 55 BPM. Solo upright bass, sparse piano, whiskey-soaked saxophone. Obsessive and insomniac. Red string on a corkboard, coffee going cold. 1960s detective film texture. Male vocal, raspy and exhausted. Cigarette smoke. Clock ticking. Dawn never quite manages to arrive."
    ),
    "Track 09 - Ruby's World": (
        "Sleazy 1960s nightclub noir jazz, slow swing, 72 BPM. Smoky saxophone lead, electric organ, walking bass, brushed snare. Dallas underworld atmosphere. Mob undercurrents throughout. Female vocal, sultry and dangerous. Neon signs and cigarette girls. Organized crime lurking behind velvet nightclub curtains."
    ),
    "Track 10 - Epilogue Unresolved": (
        "Melancholic orchestral elegy, 48 BPM. Solo cello melody over a soft string choir. Sparse piano, distant trumpet echo. Acceptance without resolution. Sixty years of silence made audible. Male and female voices in quiet harmony. No climax, no answer ever comes. Fades as questions remain. Timeless American grief."
    ),
}

all_ok = True
for name, desc in tracks.items():
    count = len(desc)
    diff = 300 - count
    if count == 300:
        status = "OK"
    elif diff > 0:
        status = f"TOO SHORT by {diff} — add {diff} chars"
    else:
        status = f"TOO LONG by {abs(diff)} — remove {abs(diff)} chars"

    marker = "✓" if count == 300 else "✗"
    print(f"{marker} {name}: {count} chars [{status}]")

    if count != 300:
        all_ok = False
        print(f"   TEXT: {desc!r}")

print()
if all_ok:
    print("ALL 10 DESCRIPTIONS ARE EXACTLY 300 CHARACTERS. Ready for Suno.")
else:
    print("Some descriptions need adjustment. See above for which ones and by how much.")
