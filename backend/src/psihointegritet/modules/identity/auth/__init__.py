"""The PDC auth engine (D-083): hashing, sessions and one-time tokens.

No routes and no HTTP live here. This layer knows how to prove who somebody is
and how to remember it; deciding which URL asks is AUTH-3's job.
"""
