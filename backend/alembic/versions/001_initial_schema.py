"""001_initial_schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-10-17 15:30:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('profile_name', sa.String(length=100), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Daily Activities table
    op.create_table(
        'daily_activities',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('date', sa.String(length=10), nullable=False),
        sa.Column('total_screen_time', sa.Float(), nullable=False),
        sa.Column('work_study_hours', sa.Float(), nullable=True),
        sa.Column('social_media_hours', sa.Float(), nullable=True),
        sa.Column('entertainment_hours', sa.Float(), nullable=True),
        sa.Column('late_night_usage', sa.Float(), nullable=True),
        sa.Column('breaks', sa.Integer(), nullable=True),
        sa.Column('average_break_minutes', sa.Float(), nullable=True),
        sa.Column('tasks_completed', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('source', sa.String(length=20), nullable=False, server_default='user'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'date', 'source', name='uq_user_date_activity')
    )
    op.create_index(op.f('ix_daily_activities_date'), 'daily_activities', ['date'], unique=False)
    op.create_index(op.f('ix_daily_activities_user_id'), 'daily_activities', ['user_id'], unique=False)

    # Mood Check-Ins table
    op.create_table(
        'mood_checkins',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('date', sa.String(length=10), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('mood', sa.Integer(), nullable=False),
        sa.Column('stress', sa.Integer(), nullable=False),
        sa.Column('energy', sa.Integer(), nullable=False),
        sa.Column('fatigue', sa.Integer(), nullable=False),
        sa.Column('note', sa.Text(), nullable=False, server_default=''),
        sa.Column('source', sa.String(length=20), nullable=False, server_default='user'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mood_checkins_date'), 'mood_checkins', ['date'], unique=False)
    op.create_index(op.f('ix_mood_checkins_user_id'), 'mood_checkins', ['user_id'], unique=False)

    # Routine Simulations table
    op.create_table(
        'routine_simulations',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('total_screen_time', sa.Float(), nullable=False),
        sa.Column('active_work', sa.Float(), nullable=False),
        sa.Column('social_media', sa.Float(), nullable=False),
        sa.Column('entertainment', sa.Float(), nullable=False),
        sa.Column('late_night', sa.Float(), nullable=False),
        sa.Column('break_count', sa.Integer(), nullable=False),
        sa.Column('avg_break_duration', sa.Integer(), nullable=False),
        sa.Column('predicted_productivity_score', sa.Float(), nullable=False),
        sa.Column('archetype_name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_routine_simulations_user_id'), 'routine_simulations', ['user_id'], unique=False)

def downgrade() -> None:
    op.drop_table('routine_simulations')
    op.drop_table('mood_checkins')
    op.drop_table('daily_activities')
    op.drop_table('users')
