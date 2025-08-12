import React from 'react';

// Professional stock photos for different UI contexts
export const PhotoGallery = {
  // User profile photos
  userProfiles: {
    student1: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    student2: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    student3: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    teacher1: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
    teacher2: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
    teacher3: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
  },

  // Subject/Study related images
  subjects: {
    computerScience: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=200&fit=crop",
    mathematics: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=300&h=200&fit=crop",
    physics: "https://images.unsplash.com/photo-1506318137071-a4e7a0677c56?w=300&h=200&fit=crop",
    chemistry: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=300&h=200&fit=crop",
    biology: "https://images.unsplash.com/photo-1530026405186-ed1f139313f7?w=300&h=200&fit=crop",
    literature: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=200&fit=crop",
    history: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop",
    art: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8a?w=300&h=200&fit=crop"
  },

  // Learning environment images
  learning: {
    classroom: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=250&fit=crop",
    onlineLearning: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=250&fit=crop",
    studyGroup: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=250&fit=crop",
    library: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=250&fit=crop",
    lab: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=250&fit=crop"
  },

  // Technology and tools
  technology: {
    laptop: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=200&fit=crop",
    tablet: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&h=200&fit=crop",
    smartphone: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=200&fit=crop",
    coding: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=200&fit=crop"
  },

  // Abstract/UI backgrounds
  backgrounds: {
    gradient1: "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=250&fit=crop",
    gradient2: "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=250&fit=crop",
    pattern1: "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=250&fit=crop",
    pattern2: "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=250&fit=crop"
  }
};

// Component to display a photo with fallback
export const PhotoDisplay = ({ 
  src, 
  alt, 
  className = "", 
  fallbackSrc = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  ...props 
}) => {
  const [imgSrc, setImgSrc] = React.useState(src || fallbackSrc);
  const [hasError, setHasError] = React.useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  React.useEffect(() => {
    setImgSrc(src || fallbackSrc);
    setHasError(false);
  }, [src, fallbackSrc]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
};

// Component for user avatars with fallback
export const UserAvatar = ({ 
  src, 
  alt, 
  size = "md", 
  className = "",
  ...props 
}) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10", 
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  return (
    <PhotoDisplay
      src={src}
      alt={alt}
      className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      fallbackSrc={PhotoGallery.userProfiles.student1}
      {...props}
    />
  );
};

// Component for subject/study images
export const SubjectImage = ({ 
  subject, 
  className = "", 
  ...props 
}) => {
  const subjectMap = {
    'computer-science': PhotoGallery.subjects.computerScience,
    'mathematics': PhotoGallery.subjects.mathematics,
    'physics': PhotoGallery.subjects.physics,
    'chemistry': PhotoGallery.subjects.chemistry,
    'biology': PhotoGallery.subjects.biology,
    'literature': PhotoGallery.subjects.literature,
    'history': PhotoGallery.subjects.history,
    'art': PhotoGallery.subjects.art
  };

  const defaultImage = PhotoGallery.subjects.computerScience;
  const imageSrc = subjectMap[subject] || defaultImage;

  return (
    <PhotoDisplay
      src={imageSrc}
      alt={`${subject} subject`}
      className={`w-full h-48 object-cover rounded-lg ${className}`}
      fallbackSrc={defaultImage}
      {...props}
    />
  );
};

export default PhotoGallery;
