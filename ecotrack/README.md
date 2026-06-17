# EcoTrack

EcoTrack is a smart carbon footprint tracker that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

## Vertical
Personal Sustainability / Carbon Footprint Tracking

## Approach
EcoTrack uses rule-based emission calculations based on standard IPCC emission factors combined with a personalized insight engine to provide actionable recommendations. It tracks user activities across transportation, energy, diet, and shopping to calculate a daily CO2 equivalent.

## How it works
1. **Daily Logging**: Users input their daily activities in the Calculator tab (e.g., miles driven, meals eaten, energy used).
2. **Real-time Calculation**: The app immediately calculates the CO2 equivalent for each input using standard emission factors.
3. **Dashboard Visualization**: User data is aggregated and visualized on the dashboard, showing category breakdowns and progress over time.
4. **Insights Engine**: The app analyzes the data to identify the highest emission sources and suggests personalized "quick wins" and actionable tips.
5. **Action Tracker**: Users can commit to and track eco-friendly actions (e.g., taking public transit, eating vegetarian), seeing their CO2 savings in real-time and building streaks.

## Assumptions
- **Emission Factors Source**: Standard reference values from environmental agencies (like IPCC) are used for calculations.
- **Average Values**: Where specific details aren't provided by the user, average values for their region or globally are assumed to calculate a baseline.
- **No Authentication Required**: For simplicity and privacy, all user data is stored locally in the browser using `localStorage`. No data is sent to an external server.
