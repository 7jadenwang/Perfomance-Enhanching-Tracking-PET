# Recovery rating and chart update

This frontend update adds 1–10 ratings in 0.5 steps for sleep quality, fatigue, soreness, and stress. New check-ins carry an optional `ratingScale: 10` marker. Existing check-ins without the marker retain their original 1–5 values in storage and backups. Charts and inputs show those legacy values ×2 for comparison; viewing them does not rewrite them. Editing a rating converts that one check-in to the new scale when you save it. Editing another field alone retains its original rating scale.

The existing concern thresholds retain the same meaning: fatigue/soreness/stress ≥8 and sleep quality ≤4 on the 10-point scale. These are descriptive check-in flags, not a readiness diagnosis.

CMJ height and body mass use padded, data-based Y-axis ranges labelled “Zoomed Y-axis.” Other load charts retain a zero baseline. Daily values and existing CMJ baseline calculations are unchanged.

Confirmed rest days have zero load across all three training-demand dimensions. Unlogged days remain unknown. A completed/partial session explicitly logged with zero duration × RPE also has zero demand even without sets.

To correct the known rest day on October 13, open **Progress → Correct a rest / training day**, select **2026-10-13**, and choose **Confirmed rest day**. This updates only that day's activity annotation, preserving all workouts and morning records. If the day also contains an existing completed workout, review that record first; nonzero training is not silently discarded. The same correction is available on Today using its training date and daily activity annotation.

Deployment: merge the update and let Vercel rebuild the frontend as usual. No Supabase SQL migration or new environment variable is needed; the existing backend stores the versioned JSON payload. **Update/reload the app on every signed-in device before recording or synchronizing new 10-point ratings.** Older cached frontend versions only understand the previous scale. Keep the same site address and browser storage. The app's update-ready button applies the cached app update without clearing athlete data.
