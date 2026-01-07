from typing import List, Dict, Any, Optional, Tuple
import re
from collections import Counter
import math
import os
import json
from datetime import datetime, timedelta
import unicodedata
import difflib
import logging

logger = logging.getLogger(__name__)
from dotenv import load_dotenv, find_dotenv, dotenv_values

# Load environment variables, ensuring .env overrides any existing env vars (fix invalid key precedence)
load_dotenv(find_dotenv(), override=True)

class NLPAnalyzer:
    """Enhanced NLP analyzer with summarization, action item extraction, and keyword extraction."""

    def __init__(self, model_name: str = "sshleifer/distilbart-cnn-12-6"):
        self.model_name = model_name
        self.summarizer = None
        
        # Initialize OpenAI client
        self.openai_client = None
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.openai_summary_model = os.getenv('OPENAI_SUMMARY_MODEL', 'gpt-4o-mini')
        self.openai_action_model = os.getenv('OPENAI_ACTION_MODEL', self.openai_summary_model)
        
        # Initialize Gemini client
        self.gemini_client = None
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        self.gemini_model = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
        
        if self.openai_api_key:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=self.openai_api_key)
                print(f"OpenAI client initialized. Summary model: {self.openai_summary_model}, Action model: {self.openai_action_model}")
            except ImportError:
                print("OpenAI library not installed. Falling back to rule-based extraction.")

        # Try Initialize Gemini client if OpenAI is not available or as fallback
        if self.gemini_api_key and not self.openai_client:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_api_key)
                self.gemini_client = genai.GenerativeModel(self.gemini_model)
                print(f"Gemini client initialized. Model: {self.gemini_model}")
            except ImportError:
                print("Google Generative AI library not installed.")
            except Exception as e:
                print(f"Failed to initialize Gemini client: {e}")
        self.action_patterns = [
            # Future tense patterns
            r'\b(will|shall|going to|need to|have to|must|should)\s+([^.!?]{5,50})',
            # Task keywords
            r'\b(todo|task|action item|follow up|next step)[:]*\s*([^.!?]+)',
            # Assignment patterns
            r'\b([A-Z][a-z]+)\s+(will|should|needs to|must)\s+([^.!?]{5,50})',
            # Meeting outcomes
            r'\b(decided|agreed|committed)\s+(?:to|that)\s+([^.!?]{5,50})',
            # Deadline patterns
            r'\b(complete|finish|deliver|submit)\s+(.+?)\s+by\s+([^.!?]+)',
        ]
        
        # Common stop words for keyword extraction
        self.stop_words = set([
            'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
            'in', 'with', 'to', 'for', 'of', 'as', 'from', 'by', 'that', 'this',
            'it', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
            'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
            'might', 'must', 'can', 'need', 'we', 'you', 'they', 'he', 'she', 'i',
            'me', 'us', 'them', 'him', 'her', 'my', 'your', 'our', 'their', 'his',
            'its', 'what', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
            'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
            'same', 'so', 'than', 'too', 'very', 'just', 'now', 'also', 'about',
            'okay', 'ok', 'yeah', 'yes', 'no', 'um', 'uh', 'like', 'well'
        ])

    def _load_summarizer(self):
        # Local LLM summarizer removed
        return

    def summarize(self, text: str, max_length: int = 150, min_length: int = 40) -> str:
        """Generate a summary of the text using ONLY Google Gemini."""
        if not text:
            return ''
    
        logger.info(f"Summarize called. Text len: {len(text)}. Gemini client: {self.gemini_client is not None}")
        
        if not self.gemini_client:
             error_msg = "Error: Google Gemini is not configured. Please check your GEMINI_API_KEY."
             logger.error(error_msg)
             return error_msg

        try:
            logger.info("Calling Gemini for summarization...")
            summary = self._summarize_gemini(text, target_words=max(80, min(220, max_length)))
            logger.info(f"Gemini summarization success. Length: {len(summary)}")
            return summary
        except Exception as e:
            error_msg = f"Summarization failed (Gemini Error): {str(e)}"
            logger.error(error_msg)
            return error_msg

    def _summarize_gemini(self, text: str, target_words: int = 150) -> str:
        """Summarize using Google Gemini."""
        prompt = f"Summarize the following meeting transcript in EXACTLY {target_words} words or less. Be specific, capture key decisions and action items.\n\nTranscript:\n{text}"
        response = self.gemini_client.generate_content(prompt)
        return response.text.strip()

    def _summarize_openai(self, text: str, target_words: int = 150) -> str:
        """Summarize using OpenAI with chunking + synthesis."""
        model = os.getenv('OPENAI_SUMMARY_MODEL', self.openai_summary_model)
        
        # Calculate transcript word count and ensure summary is < 50% of original
        transcript_word_count = len(text.split())
        max_summary_words = int(transcript_word_count * 0.45)  # 45% to ensure we stay under 50%
        target_words = max(50, min(target_words, max_summary_words, 500))
        
        print(f"Transcript: {transcript_word_count} words | Target summary: {target_words} words ({(target_words/transcript_word_count)*100:.1f}%)")
        
        if len(text) <= 3500:
            messages = [
                {"role": "system", "content": "You are an expert meeting summarizer."},
                {"role": "user", "content": f"Summarize the transcript in {target_words} words. Be specific.\n\nTranscript:\n{text}"}
            ]
            resp = self.openai_client.chat.completions.create(
                model=model, messages=messages, temperature=0, max_tokens=min(800, int(target_words * 2))
            )
            return resp.choices[0].message.content.strip()
        
        # Basic chunking for long text (simplified for brevity)
        return text[:3500] + "...(truncated)"

    def extract_action_items(self, text: str, meeting_date: str = None, attendees: List[str] = None) -> Dict[str, Any]:
        """Extract items using ONLY Google Gemini."""
        empty_result = {'action_items': [], 'decisions': [], 'key_topics': [], 'metadata': {'method': 'failed'}}
        
        if not text:
            return empty_result
        
        if not self.gemini_client:
            logger.error("Extract action items failed: Gemini not configured.")
            empty_result['metadata']['error'] = "Gemini not configured"
            return empty_result

        try:
            logger.info("Calling Gemini for action item extraction...")
            result = self._extract_enhanced_items_gemini(text, meeting_date, attendees)
            logger.info(f"Gemini extraction successful")
            return result
        except Exception as e:
            logger.error(f"Gemini extraction failed: {e}")
            empty_result['metadata']['error'] = str(e)
            return empty_result

    def _extract_enhanced_items_gemini(self, text: str, meeting_date: str = None, attendees: List[str] = None) -> Dict[str, Any]:
        """Extract items using Gemini with JSON mode."""
        from datetime import datetime
        start_time = datetime.now()
        
        meeting_date = meeting_date or datetime.now().isoformat()
        attendees_str = ", ".join(attendees) if attendees else "Unknown attendees"
        
        prompt = f"""
        Extract actionable tasks, decisions, and key topics from this meeting transcript.
        
        Context:
        - Date: {meeting_date}
        - Attendees: {attendees_str}
        
        Transcript:
        {text}
        
        Return ONLY a JSON object with this schema:
        {{
          "action_items": [
            {{ "text": "Task description", "owner": "Name or Unassigned", "priority": "P1/P2/P3", "confidence": 0.9, "category": "Category" }}
          ],
          "decisions": [
            {{ "decision": "What was decided", "confidence": 0.9 }}
          ],
          "key_topics": [
            {{ "topic": "Topic name", "description": "Brief description", "importance_level": "High/Medium/Low" }}
          ]
        }}
        """
        
        response = self.gemini_client.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        try:
            result = json.loads(response.text)
            validated_result = self._validate_and_enhance_extraction(result, text, attendees)
            validated_result['metadata'] = {
                'method': 'gemini',
                'model': self.gemini_model,
                'extraction_time': (datetime.now() - start_time).total_seconds()
            }
            return validated_result
        except Exception as e:
            print(f"Failed to parse Gemini JSON: {e}")
            raise

    def _extract_action_items_rule_based(self, text: str) -> List[Dict[str, Any]]:
        """Extract action items from text using rule-based patterns (fallback method)."""
        if not text:
            return []
        
        action_items = []
        seen_items = set()  # To avoid duplicates
        
        # Split text into sentences
        sentences = re.split(r'[.!?]+', text)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < 10:
                continue
                
            # Check each pattern
            for pattern in self.action_patterns:
                matches = re.finditer(pattern, sentence, re.IGNORECASE)
                for match in matches:
                    # Extract the action text
                    action_text = ''
                    if len(match.groups()) >= 3:
                        action_text = match.group(3).strip()
                    elif len(match.groups()) >= 2:
                        action_text = match.group(2).strip()
                    elif len(match.groups()) >= 1:
                        action_text = match.group(1).strip()
                    
                    if not action_text:
                        continue
                    
                    # Clean up the action text
                    action_text = re.sub(r'^[-•*\s]+', '', action_text)
                    action_text = action_text.strip()
                    
                    # Split multi-owner/commitment fragments
                    fragments = re.split(r";\s*", action_text)
                    refined: List[str] = []
                    for frag in fragments:
                        parts = re.split(r",?\s+and\s+(?=[A-Z][a-z]+\b)", frag)
                        refined.extend([p.strip() for p in parts if p.strip()])
                    if not refined:
                        refined = [action_text]
                    
                    for frag in refined:
                        # Skip items that look already completed
                        if self._is_completed_statement(sentence) or self._is_completed_statement(frag):
                            continue
                        # Skip if too short or already seen
                        key = frag.lower()
                        if len(frag) > 10 and key not in seen_items:
                            # Try to extract assignee from the fragment first, then from full sentence
                            assignee = None
                            for token in (frag, sentence):
                                assignee = assignee or self._extract_assignee(token)
                                if assignee:
                                    break
                            # Try to extract deadline from the fragment
                            deadline = self._extract_deadline(frag) or self._extract_deadline(sentence)
                            action_item = {
                                'text': frag[:200],
                                'assignee': assignee,
                                'deadline': deadline
                            }
                            action_items.append(action_item)
                            seen_items.add(key)
                            if len(action_items) >= 10:
                                return action_items
        
        return action_items
    
    def _validate_and_enhance_extraction(self, result: Dict[str, Any], text: str, attendees: List[str] = None) -> Dict[str, Any]:
        """Validate and enhance the extracted items with evidence verification and quality checks."""
        transcript = text or ""
        transcript_lower = transcript.lower()
        attendee_set = set(attendees or [])
        
        def _build_flexible_regex(ev: str) -> Optional[re.Pattern]:
            tokens = [t for t in re.findall(r"\w+", ev) if t]
            if len(tokens) < 2 or len(tokens) > 25:
                return None
            parts = [r"\b" + re.escape(tok) + r"\b" for tok in tokens]
            sep = r"[\s\.,;:!\?\-–—'\"/\\()\[\]]+"
            pattern = sep.join(parts)
            try:
                return re.compile(pattern, re.IGNORECASE)
            except Exception:
                return None
        
        def find_span(ev: str):
            if not ev:
                return None
            ev_norm = ev.strip()
            # Simple case-insensitive exact match first
            idx = transcript_lower.find(ev_norm.lower())
            if idx >= 0:
                return idx, idx + len(ev_norm)
            # Flexible regex match
            regex = _build_flexible_regex(ev_norm)
            if regex:
                m = regex.search(transcript)
                if m:
                    return m.start(), m.end()
            return None
        
        validated_result = {
            'action_items': [],
            'decisions': [],
            'key_topics': [],
            'metadata': result.get('metadata', {'method': 'openai', 'confidence': 0.8})
        }
        
        # Validate action items
        for item in result.get('action_items', []):
            if isinstance(item, dict) and 'text' in item and item['text'].strip():
                evidence = (item.get('evidence_quote') or '').strip()
                span = find_span(evidence)
                if not evidence or not span:
                    continue
                
                start, end = span
                enhanced_item = {
                    'text': str(item.get('text', ''))[:300],
                    'owner': item.get('owner') or 'Unassigned',
                    'due_date_iso': item.get('due_date_iso') or None,
                    'priority': item.get('priority', 'P3'),
                    'confidence': float(item.get('confidence', 0.7)),
                    'evidence_quote': evidence,
                    'char_start': start,
                    'char_end': end,
                    'category': item.get('category', 'Other'),
                    'urgency_indicators': item.get('urgency_indicators', []),
                    'assignee': item.get('owner') or 'Unassigned',  # Legacy compatibility
                    'deadline': item.get('due_date_iso') or 'No deadline specified'  # Legacy compatibility
                }
                
                # Skip completed items
                if not self._is_completed_statement(evidence + ' ' + enhanced_item['text']):
                    validated_result['action_items'].append(enhanced_item)
        
        # Validate decisions
        for item in result.get('decisions', []):
            if isinstance(item, dict) and 'decision' in item and item['decision'].strip():
                evidence = (item.get('evidence_quote') or '').strip()
                span = find_span(evidence)
                if not evidence or not span:
                    continue
                    
                start, end = span
                enhanced_item = {
                    'decision': str(item.get('decision', ''))[:300],
                    'rationale': item.get('rationale') or 'Not specified',
                    'decision_maker': item.get('decision_maker') or 'Not specified',
                    'impact': item.get('impact') or 'Not specified',
                    'confidence': float(item.get('confidence', 0.7)),
                    'evidence_quote': evidence,
                    'char_start': start,
                    'char_end': end,
                    'category': item.get('category', 'Other')
                }
                validated_result['decisions'].append(enhanced_item)
        
        # Validate key topics
        for item in result.get('key_topics', []):
            if isinstance(item, dict) and 'topic' in item and item['topic'].strip():
                evidence = (item.get('evidence_quote') or '').strip()
                span = find_span(evidence)
                if not evidence or not span:
                    continue
                    
                start, end = span
                enhanced_item = {
                    'topic': str(item.get('topic', ''))[:200],
                    'description': item.get('description') or 'No description provided',
                    'duration_indicators': item.get('duration_indicators', []),
                    'importance_level': item.get('importance_level', 'Medium'),
                    'confidence': float(item.get('confidence', 0.6)),
                    'evidence_quote': evidence,
                    'char_start': start,
                    'char_end': end,
                    'category': item.get('category', 'Other')
                }
                validated_result['key_topics'].append(enhanced_item)
        
        # Sort by confidence and priority
        validated_result['action_items'].sort(key=lambda x: (x['priority'], -x['confidence']))
        validated_result['decisions'].sort(key=lambda x: -x['confidence'])
        validated_result['key_topics'].sort(key=lambda x: (-x['confidence'], x['importance_level'] == 'High'))
        
        # Limit results
        validated_result['action_items'] = validated_result['action_items'][:20]
        validated_result['decisions'] = validated_result['decisions'][:15]
        validated_result['key_topics'] = validated_result['key_topics'][:10]
        
        return validated_result
    
    def _extract_enhanced_items_rule_based(self, text: str, meeting_date: str = None, attendees: List[str] = None) -> Dict[str, Any]:
        """Enhanced rule-based extraction for action items, decisions, and topics as fallback."""
        if not text:
            return {
                'action_items': [],
                'decisions': [],
                'key_topics': [],
                'metadata': {'method': 'rule_based', 'confidence': 0.5, 'extraction_time': None}
            }
        
        from datetime import datetime
        start_time = datetime.now()
        
        # Use legacy rule-based action item extraction
        legacy_action_items = self._extract_action_items_rule_based(text)
        
        # Extract decisions using rule-based patterns
        decision_patterns = [
            r'\b(decided|agreed|concluded|determined|resolved)\s+(?:to|that|on)\s+([^.!?]{10,100})',
            r'\b(decision|resolution|agreement)[:]*\s*([^.!?]+)',
            r'\b(we\s+will|let\'s|going\s+to|plan\s+to)\s+([^.!?]{10,100})',
            r'\b(consensus|unanimous|majority)\s+(?:is|was|to)\s+([^.!?]{10,100})'
        ]
        
        decisions = []
        for pattern in decision_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                decision_text = match.group(2).strip() if len(match.groups()) >= 2 else match.group(1).strip()
                if len(decision_text) > 10:
                    decisions.append({
                        'decision': decision_text[:300],
                        'rationale': 'Not specified',
                        'decision_maker': 'Not specified',
                        'impact': 'Not specified',
                        'confidence': 0.6,
                        'evidence_quote': match.group(0)[:100],
                        'char_start': match.start(),
                        'char_end': match.end(),
                        'category': 'Other'
                    })
        
        # Extract key topics using rule-based patterns
        topic_patterns = [
            r'\b(discuss|talking\s+about|focus\s+on|regarding|concerning)\s+([^.!?]{5,50})',
            r'\b(topic|subject|issue|matter|question)\s*[:]*\s*([^.!?]+)',
            r'\b(main\s+point|key\s+issue|important\s+aspect)\s*[:]*\s*([^.!?]+)'
        ]
        
        topics = []
        topic_set = set()
        for pattern in topic_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                topic_text = match.group(2).strip() if len(match.groups()) >= 2 else match.group(1).strip()
                topic_key = topic_text.lower()[:50]
                if len(topic_text) > 5 and topic_key not in topic_set:
                    topic_set.add(topic_key)
                    topics.append({
                        'topic': topic_text[:200],
                        'description': 'Identified from meeting discussion',
                        'duration_indicators': [],
                        'importance_level': 'Medium',
                        'confidence': 0.5,
                        'evidence_quote': match.group(0)[:100],
                        'char_start': match.start(),
                        'char_end': match.end(),
                        'category': 'Other'
                    })
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return {
            'action_items': legacy_action_items,
            'decisions': decisions[:15],
            'key_topics': topics[:10],
            'metadata': {
                'method': 'rule_based',
                'confidence': 0.5,
                'extraction_time': processing_time,
                'processing_timestamp': datetime.now().isoformat()
            }
        }
    
    def _is_completed_statement(self, text: str) -> bool:
        """Heuristic to detect statements that indicate the work is already completed."""
        if not text:
            return False
        t = text.lower()
        completed_markers = [
            "already", "has been", "have been", "was completed", "were completed",
            "finalized", "finished", "done", "ready to be shared", "is ready", "are ready",
            "created yesterday", "yesterday", "we have", "we've",
        ]
        # Avoid false positives when paired with future modals
        future_markers = ["will ", "need to", "must ", "should ", "by "]
        if any(m in t for m in completed_markers) and not any(f in t for f in future_markers):
            return True
        return False
    
    def _merge_similar_items(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Merge similar action items to avoid duplicates."""
        if len(items) <= 1:
            return items
        
        merged = []
        processed_indices = set()
        
        for i, item1 in enumerate(items):
            if i in processed_indices:
                continue
                
            # Start with the current item
            merged_item = item1.copy()
            similar_items = [item1]
            
            # Find similar items
            for j, item2 in enumerate(items[i+1:], start=i+1):
                if j in processed_indices:
                    continue
                    
                # Calculate similarity
                similarity = difflib.SequenceMatcher(None, 
                    item1['text'].lower(), 
                    item2['text'].lower()).ratio()
                
                # If similar enough, merge
                if similarity > 0.7:
                    similar_items.append(item2)
                    processed_indices.add(j)
                    
                    # Keep the better fields
                    if item2.get('assignee') and item2['assignee'] != 'Unassigned':
                        merged_item['assignee'] = item2['assignee']
                    if item2.get('deadline') and item2['deadline'] != 'No deadline specified':
                        merged_item['deadline'] = item2['deadline']
                    if item2.get('confidence', 0) > merged_item.get('confidence', 0):
                        merged_item['confidence'] = item2['confidence']
                        merged_item['evidence'] = item2.get('evidence', '')
            
            # Average confidence across similar items
            if len(similar_items) > 1 and 'confidence' in merged_item:
                total_conf = sum(item.get('confidence', 0.5) for item in similar_items)
                merged_item['confidence'] = total_conf / len(similar_items)
            
            merged.append(merged_item)
            processed_indices.add(i)
        
        return merged
    
    def _normalize_dates(self, text: str, reference_date: datetime = None) -> str:
        """Convert relative dates to absolute dates."""
        if not reference_date:
            reference_date = datetime.now()
        
        # Map of relative terms to days
        relative_mappings = {
            'today': 0,
            'tomorrow': 1,
            'day after tomorrow': 2,
            'next monday': None,  # Special handling
            'next tuesday': None,
            'next wednesday': None,
            'next thursday': None,
            'next friday': None,
            'next week': 7,
            'in two weeks': 14,
            'next month': 30,
            'end of week': None,  # Special handling
            'eod': 0,  # End of day today
            'eow': None,  # End of week
            'eom': None,  # End of month
        }
        
        normalized_text = text.lower()
        
        # Handle "next [day]" patterns
        for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
            if f'next {day}' in normalized_text:
                # Find the next occurrence of this day
                days_ahead = 0
                current_day = reference_date.weekday()
                target_day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].index(day)
                
                if target_day <= current_day:
                    days_ahead = 7 - current_day + target_day
                else:
                    days_ahead = target_day - current_day
                
                target_date = reference_date + timedelta(days=days_ahead)
                return target_date.strftime('%Y-%m-%d')
        
        # Handle other relative dates
        for term, days in relative_mappings.items():
            if term in normalized_text and days is not None:
                target_date = reference_date + timedelta(days=days)
                return target_date.strftime('%Y-%m-%d')
        
        # If no conversion possible, return original
        return text
    
    def _extract_assignee(self, text: str) -> str:
        """Extract assignee from text."""
        # Look for names (capitalized words) before action verbs
        pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:will|should|needs to|must|to)\s+'
        match = re.search(pattern, text)
        if match:
            name = match.group(1)
            # Filter out common non-name words
            if name.lower() not in ['the', 'we', 'they', 'it', 'this', 'that']:
                return name
        return None
    
    def _extract_deadline(self, text: str) -> str:
        """Extract deadline from text."""
        # Look for date patterns
        patterns = [
            r'by\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)',
            r'by\s+(tomorrow|today|next week|next month|end of day|EOD|COB)',
            r'by\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+',
            r'by\s+(\d{1,2}/\d{1,2}(?:/\d{2,4})?)',
            r'before\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)',
            r'deadline[:\s]+([\w\s]+?)(?:[,.]|$)',
            r'due\s+([\w\s]+?)(?:[,.]|$)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None
    
    def extract_keywords(self, text: str, num_keywords: int = 10) -> List[str]:
        """Extract keywords using TF-IDF."""
        if not text:
            return []
        
        # Tokenize and clean text
        words = re.findall(r'\b[a-z]+\b', text.lower())
        
        # Filter out stop words and short words
        words = [w for w in words if w not in self.stop_words and len(w) > 3]
        
        if not words:
            return []
        
        # Calculate word frequencies
        word_freq = Counter(words)
        total_words = len(words)
        
        # Calculate TF-IDF scores (simplified version)
        tfidf_scores = {}
        for word, freq in word_freq.items():
            tf = freq / total_words
            # Simple IDF: penalize very common words
            idf = math.log(total_words / (1 + freq)) if freq < total_words * 0.5 else 0.1
            tfidf_scores[word] = tf * idf
        
        # Get top keywords
        top_keywords = sorted(tfidf_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Return top N keywords
        return [word for word, score in top_keywords[:num_keywords]]
