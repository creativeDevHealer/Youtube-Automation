module.exports = {
  // Negative keywords - never like/heart these comments
  negative: [
    'depressed',
    'anxious',
    'scared',
    'nothing is happening',
    'nothing happened',
    'death',
    'sick',
    'illness',
    'died',
    'cancer',
    'funeral'
  ],

  // Troll/spam keywords - delete these comments
  troll: [
    'too long',
    'talk too much',
    'get to the point',
    'you talk too much',
    'finish a sentence',
    'get on with the reading',
    'nothing you say happens'
  ],

  // Milestone keywords - auto-reply with congratulations
  milestones: {
    'my birthday': 'Happy birthday! 🥳🎉',
    'promotion': 'Congrats! 🥳🎉',
    'getting married': 'Congrats! 🥳🎉',
    'proposed to': 'Congrats! 🥳🎉',
    'launched new business': 'Congrats! 🥳🎉',
    'made money': 'amazing! 😍🙌🌠',
    'raise': 'amazing! 😍🙌🌠',
    'wedding': 'Congrats! 🥳🎉',
    'starting new job': 'Congrats! 🎉😙❤️'
  },

  // Praise keywords - auto-reply with thanks
  praise: {
    'congrats!': 'Thank you so much! 🥰😙❤️',
    'you\'re the best': 'Thank you so much! 🥰❤️🙏'
  },

  // Special keywords
  special: {
    'ruby': '🐶🥰❤️'
  },

  // Website access issues - auto-reply for launch updates
  websiteAccess: {
    'can\'t get access to your website': 'Thanks so much! I\’ll update you for launch 🚀',
    'can\'t access your website': 'Thanks so much! I\’ll update you for launch 🚀',
    'can\'t get to your website': 'Thanks so much! I\’ll update you for launch 🚀',
    'can\'t get further on your new website': 'Thanks so much! I\’ll update you for launch 🚀',
    'can\'t access website': 'Thanks so much! I\’ll update you for launch 🚀',
    'website not working': 'Thanks so much! I\’ll update you for launch 🚀',
    'website won\'t load': 'Thanks so much! I\’ll update you for launch 🚀',
    'website down': 'Thanks so much! I\’ll update you for launch 🚀',
    'greatawakener.com': 'Thanks so much! I\’ll update you for launch 🚀',
    'great awakener website': 'Thanks so much! I\’ll update you for launch 🚀',
    'the great awakener': 'Thanks so much! I\’ll update you for launch 🚀',
    'website access': 'Thanks so much! I\’ll update you for launch 🚀',
    'website issue': 'Thanks so much! I\’ll update you for launch 🚀',
    'website problem': 'Thanks so much! I\’ll update you for launch 🚀',
    'can\'t log in to website': 'Thanks so much! I\’ll update you for launch 🚀',
    'can\'t sign up on website': 'Thanks so much! I\’ll update you for launch 🚀',
    'website error': 'Thanks so much! I\’ll update you for launch 🚀',
    'can\'t join your new site': 'Thanks so much! I\’ll update you for launch 🚀',
    'can\'t seem to make it happen': 'Thanks so much! I\’ll update you for launch 🚀',
    'tried multiple times to join': 'Thanks so much! I\’ll update you for launch 🚀',
    'can\'t join': 'Thanks so much! I\’ll update you for launch 🚀',
    'join your new site': 'Thanks so much! I\’ll update you for launch 🚀',
    'having problems': 'Thanks so much! I\’ll update you for launch 🚀',
    'site problems': 'Thanks so much! I\’ll update you for launch 🚀',
    'new site': 'Thanks so much! I\’ll update you for launch 🚀',
    'can\'t wait to see your website': 'Thanks so much! I\’ll update you for launch 🚀',
    'excited for your website': 'Thanks so much! I\’ll update you for launch 🚀',
    'looking forward to your website': 'Thanks so much! I\’ll update you for launch 🚀',
    'when will your website': 'Thanks so much! I\’ll update you for launch 🚀',
    'your website launch': 'Thanks so much! I\’ll update you for launch 🚀',
    'website coming soon': 'Thanks so much! I\’ll update you for launch 🚀',
    'waiting for your website': 'Thanks so much! I\’ll update you for launch 🚀',
    'website ready': 'Thanks so much! I\’ll update you for launch 🚀',
    'see your website': 'Thanks so much! I\’ll update you for launch 🚀'
  },

  // Alert keywords - trigger notifications
  alerts: [
    'prediction came true',
    'changed my life',
    'agent',
    'book',
    'are you single'
  ],

  // Positive sentiment indicators
  positive: [
    'love',
    'amazing',
    'incredible',
    'perfect',
    'spot on',
    'accurate',
    'helpful',
    'thank you',
    'grateful',
    'blessed',
    'manifested',
    'came true',
    'worked',
    'happened'
  ]
}; 