# Fish Audio benchmark capture

This CLI captures private Fish Audio ASR responses for the existing TypeScribe Bench tracks. It does not change the editor's Deepgram transcription button or publish benchmark results. Audio uploads require explicit execution approval. References and scoring annotations remain local; captured responses and transcript text stay in private storage and never enter the public export.

## Recorded benchmark addition

On October 7, 2026, both models ran through the private native TranscriptBench pipeline with the existing frozen recordings, accepted references, request settings and scoring rules. This capture used the private evaluation workspace, not this CLI's default output folder. Rebuilding scores from those saved captures requires no new provider call.

| Model | Full English accuracy | Full English WER | Swahili-English result | Combined rank |
| --- | ---: | ---: | --- | --- |
| `transcribe-1` | 84.81% | 15.19% | 60-second eligibility probe did not pass | None |
| `transcribe-1-pro` | 89.72% | 10.28% | 60-second eligibility probe did not pass | None |

Each model completed all three frozen English files. The standard model identified the mixed-language probe as Malay and did not preserve the accepted Swahili speech; Pro returned no scorable spoken text after speaker/non-speech annotation handling. No full Swahili-English Fish capture was sent. Probe comparisons stay private and are not published as full-track scores. Eligibility review compared text and language evidence against the accepted reference; it was not a new human listening audit.

The eight successful ASR requests, six full English files and two probes, had a conservative rounded-duration estimate of **$0.3724** against the approved **$0.80** cap. No failed request or paid retry occurred. This is an estimate, not a verified invoice. Existing provider captures, measurements, combined ranks and confidence intervals were preserved. The final English reference listening audit remains explicitly waived.

The local public benchmark includes both real English results while leaving their Swahili and combined metrics null. Its existing root policy/coverage and matrix/probe cost fields follow the Swahili-English configuration; they do not describe total expenditure or English-only coverage. The approved public v2 extension adds complete per-track aggregate records without changing those existing fields.

All languages remains the default combined view. Selecting English switches every chart and the table to the saved full English scores, intervals and ranks for all ten models. Fish Pro has 89.5481 TypeScribe points and the lowest English WER at 10.2826%; standard has 85.4143 TypeScribe points. Both retain native English TypeScribe rank 1 within the paired-bootstrap tie group. This is distinct from their English WER order and does not create a combined rank. Swahili-English mode excludes their failed eligibility probes. `node scripts/export-benchmark-tracks.mjs` exports those existing report aggregates with no provider request or scoring rerun. No deployment was performed.

## What Fish Audio offers

Fish Audio documents a beta speech-to-text endpoint at `POST https://api.fish.audio/v1/asr`. It accepts an audio upload as multipart form data and authenticates with a Bearer API key. Choose the model in the `model` HTTP header:

- `transcribe-1` is the general transcription model.
- `transcribe-1-pro` is aimed at multi-speaker conversation and can include speaker, emotion, and vocal-event markers in the transcript text.

Set `ignore_timestamps=false` to request timed segments. The response also includes the full transcript, detected language when available, and audio duration. Pro's speaker labels appear inline in `text`; timed `segments` do not have speaker IDs. Keep the raw response when scoring so tags and segment differences remain reviewable.

Fish lists both ASR models at **$0.36 per audio hour**. It rounds each request's audio duration up to the next second. That puts the full six-file TypeScribe matrix at about **$0.3602 per model**, based on the published durations. Capturing both Fish models is about **$0.7204** for a full pass, plus any eligibility probes. These are current list-price estimates, not an invoice. Account balance, taxes, pricing changes, and actual provider duration can affect the charge. The CLI checks `--max-cost-usd` against manifest and provider-reported durations; Fish does not enforce it as an account spending limit, so inaccurate duration metadata can still produce a higher charge.

Fish's current ASR docs do not explicitly promise Swahili support. Run and review the separate 60-second Swahili-English probe before sending the full private track. Fish says the optional `language` field is a hint and language detection still runs. This runner omits the hint so code-switching audio uses automatic detection.

Official sources:

- [Speech-to-text endpoint](https://docs.fish.audio/api-reference/endpoint/openapi-v1/speech-to-text)
- [Speech-to-text guide](https://docs.fish.audio/features/speech-to-text)
- [Pricing and rate limits](https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits)
- [API key setup](https://docs.fish.audio/developer-guide/getting-started/api-key)

## Set the key

Add `FISH_API_KEY=your_key_here` to the benchmark environment file at `benchmarks/transcriptbench-v1/.env` inside this checkout. That file already holds the other provider credentials. The runner checks it by default, then falls back to the project `.env`; use `--env-file <path>` if your benchmark env lives elsewhere. A shell-provided `FISH_API_KEY` takes precedence. Keep the key out of source control and logs. The complete local `benchmarks/` workspace is ignored by Git.

## Prepare the manifest

Copy `scripts/fish-benchmark.manifest.example.json` to a private location and replace its example paths with the frozen benchmark audio paths. Keep the one-minute Swahili-English probe separate from the three scored Swahili-English files. Do not add reference text, annotations, key terms, or speaker names. The CLI hashes each audio file before sending it and records that hash with its raw response.

The full matrix must include the existing three 10-minute Swahili-English files and the three Earnings-21 windows already described in the benchmark methodology. File paths and captures belong in local storage only.

## Run a probe first

Preflight does not need a key and does not send audio:

```bash
node scripts/benchmark-fish-audio.mjs --manifest path/to/private-manifest.json --mode probe --max-cost-usd 0.006
```

Inspect the files, hashes, model, and estimate. To send the one-minute probe:

```bash
node scripts/benchmark-fish-audio.mjs --manifest path/to/private-manifest.json --mode probe --model transcribe-1 --max-cost-usd 0.006 --execute
```

Review Fish's detected language and transcript against the audio. The probe is a support check, not a scored result. Repeat it with `--model transcribe-1-pro` if you want to qualify Pro separately.

## Capture the full tracks

After reviewing the Swahili-English probe, run the full corpus. The command requires an explicit acknowledgement before it sends the private Swahili-English files:

```bash
node scripts/benchmark-fish-audio.mjs --manifest path/to/private-manifest.json --mode full --model transcribe-1 --allow-swahili --max-cost-usd 0.37 --execute
```

To capture both Fish models, use `--model transcribe-1,transcribe-1-pro` and set the cap to at least `$0.73`, plus probe costs. The runner sends requests one at a time, saves each successful response atomically, and reuses matching saved captures on resume. It does not retry failed or ambiguous requests automatically. Check Fish usage before retrying a failure.

For an English-only pass, use `--track english`; it skips the Swahili acknowledgement and still requires the three frozen English windows. `--track swahili-english` captures only the private track.

Outputs go under the ignored `tmp/benchmark-fish-audio/` folder by default. A capture JSON contains the raw Fish response, model/settings, input path, duration, byte count, input SHA-256, runtime, and estimated cost. Keep these files private. Do not copy them into the public benchmark JSON.

## Scoring boundary

The runner only captures provider output. It does not calculate WER, quality gates, confidence intervals, or a TypeScribe score. Apply the existing frozen normalization and scoring rules locally, compare Fish to the same references used for the other providers, then update the public results only after coverage, eligibility, and scoring have been reviewed. Fish's inline Pro annotations and segments without speaker IDs need deliberate handling under the existing normalization rules; do not silently count them as spoken words or assume segment-level diarization.
